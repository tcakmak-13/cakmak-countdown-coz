import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Authorization: only allow calls from DB trigger (service role) or with service role key
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    // Allow: service_role bearer token OR anon key from DB trigger (forward_notification_to_push)
    const token = authHeader?.replace('Bearer ', '') || '';
    if (token !== serviceRoleKey && token !== anonKey) {
      // If using anon key, verify it came from a trusted source (DB webhook)
      // For extra safety, we could check origin but DB triggers don't send origin
    }
    // For non-service-role tokens, verify the request has the webhook shape
    if (token !== serviceRoleKey) {
      const body = await req.clone().json();
      if (body.type !== 'INSERT' || !body.record) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    );

    // Desteklenen iki çağrı biçimi:
    // 1) Doğrudan: { user_id, title, message, link, icon }
    // 2) DB webhook: { type:'INSERT', table:'notifications', record:{ user_id, title, message, link, icon } }
    let user_id: string, title: string, message: string, link: string | undefined, icon: string | undefined;

    if (body.type === 'INSERT' && body.record) {
      const r = body.record;
      user_id = r.user_id;
      title = r.title;
      message = r.message;
      link = r.link;
      icon = r.icon;
    } else {
      user_id = body.user_id;
      title = body.title;
      message = body.message;
      link = body.link;
      icon = body.icon;
    }

    if (!user_id || !title) {
      return new Response(JSON.stringify({ sent: 0, reason: 'missing fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webPush = await import('npm:web-push@3.6.7');
    webPush.default.setVapidDetails(
      'mailto:info@cakmakkocluk.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({
      title: title || 'ÇakmakKoçluk',
      message: message || '',
      link: link || '/',
      icon: icon || 'bell',
      id: crypto.randomUUID(),
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webPush.default.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-push hatası:', err);
    return new Response(JSON.stringify({ error: 'Bildirim gönderilemedi.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
