import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;
const EMAIL_DOMAIN = "cakmak.internal";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, username, password, fullName } = await req.json();

    if (action === "login") {
      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı ve şifre gerekli." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = `${username}@${EMAIL_DOMAIN}`;

      // Check if admin account exists, create if first login
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const adminExists = existing?.users?.some((u) => u.email === email);

        if (!adminExists) {
          const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: "Admin", username: ADMIN_USERNAME },
          });
          if (createErr) {
            console.error('Admin creation error:', createErr);
            return new Response(JSON.stringify({ error: "Admin hesabı oluşturulamadı." }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          // Set role to admin
          if (newUser?.user) {
            await supabase.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.user.id);
            await supabase.from("profiles").update({ profile_completed: true, full_name: "Admin" }).eq("user_id", newUser.user.id);
          }
        }
      }

      // Sign in using the anon key client for proper session
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

      if (error) {
        return new Response(JSON.stringify({ error: "Geçersiz kullanıcı adı veya şifre." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ session: data.session, user: data.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-student") {
      // Verify caller is admin
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: callerUser } = await callerClient.auth.getUser();
      if (!callerUser?.user) {
        return new Response(JSON.stringify({ error: "Geçersiz oturum." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerUser.user.id).single();
      if (roleData?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Sadece adminler öğrenci oluşturabilir." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı ve şifre gerekli." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = `${username}@${EMAIL_DOMAIN}`;
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || username, username },
      });

      if (createErr) {
        console.error('User creation error:', createErr);
        if (createErr.message.includes("already been registered")) {
          return new Response(JSON.stringify({ error: "Bu kullanıcı adı zaten mevcut." }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Kullanıcı oluşturulamadı." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, userId: newUser?.user?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Geçersiz işlem." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('Custom auth error:', err);
    return new Response(JSON.stringify({ error: "Bir hata oluştu. Lütfen tekrar deneyin." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
