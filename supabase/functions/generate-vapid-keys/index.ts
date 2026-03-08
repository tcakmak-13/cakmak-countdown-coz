import webPush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const vapidKeys = webPush.generateVAPIDKeys();

  return new Response(JSON.stringify({
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
