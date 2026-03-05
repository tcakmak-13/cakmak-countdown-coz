import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;
const EMAIL_DOMAIN = "cakmak.internal";

const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function isRateLimited(username: string): boolean {
  const record = failedAttempts.get(username);
  if (!record) return false;
  if (Date.now() - record.lastAttempt > LOCKOUT_DURATION_MS) {
    failedAttempts.delete(username);
    return false;
  }
  return record.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(username: string) {
  const record = failedAttempts.get(username) || { count: 0, lastAttempt: 0 };
  record.count += 1;
  record.lastAttempt = Date.now();
  failedAttempts.set(username, record);
}

function clearFailedAttempts(username: string) {
  failedAttempts.delete(username);
}

function isPasswordStrong(password: string): boolean {
  return password.length >= 8;
}

Deno.serve(async (req) => {
  const cors = corsHeaders;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, username, password, fullName } = await req.json();

    if (action === "login") {
      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı ve şifre gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (isRateLimited(username)) {
        return new Response(JSON.stringify({ error: "Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin." }), {
          status: 429, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const email = `${username}@${EMAIL_DOMAIN}`;

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
              status: 500, headers: { ...cors, "Content-Type": "application/json" },
            });
          }
          if (newUser?.user) {
            await supabase.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.user.id);
            await supabase.from("profiles").update({ profile_completed: true, full_name: "Admin" }).eq("user_id", newUser.user.id);
          }
        }
      }

      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data, error } = await anonClient.auth.signInWithPassword({ email, password });

      if (error) {
        recordFailedAttempt(username);
        return new Response(JSON.stringify({ error: "Geçersiz kullanıcı adı veya şifre." }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      clearFailedAttempts(username);
      return new Response(JSON.stringify({ session: data.session, user: data.user }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "create-student") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: callerUser } = await callerClient.auth.getUser();
      if (!callerUser?.user) {
        return new Response(JSON.stringify({ error: "Geçersiz oturum." }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerUser.user.id).single();
      if (roleData?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Sadece adminler öğrenci oluşturabilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı ve şifre gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (!isPasswordStrong(password)) {
        return new Response(JSON.stringify({ error: "Şifre en az 8 karakter olmalıdır." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
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
            status: 409, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Kullanıcı oluşturulamadı." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, userId: newUser?.user?.id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-student") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: callerUser } = await callerClient.auth.getUser();
      if (!callerUser?.user) {
        return new Response(JSON.stringify({ error: "Geçersiz oturum." }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerUser.user.id).single();
      if (roleData?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Sadece adminler öğrenci silebilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: body } = await new Response(null).json().catch(() => ({ data: null }));
      const profileId = (await req.clone().json?.() || {}).profileId;
      
      // We already parsed the body at the top, use the destructured values
      // profileId comes from the request body parsed at top level - we need to re-read
      // Actually the body was already parsed above. Let's use a different approach.
    }

    return new Response(JSON.stringify({ error: "Geçersiz işlem." }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('Custom auth error:', err);
    return new Response(JSON.stringify({ error: "Bir hata oluştu. Lütfen tekrar deneyin." }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
