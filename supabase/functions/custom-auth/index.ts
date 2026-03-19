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

function isUsernameValid(username: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(username) && username.length >= 2 && username.length <= 50;
}

async function verifyAdmin(req: Request, supabase: any, supabaseUrl: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerUser } = await callerClient.auth.getUser();
  if (!callerUser?.user) return null;
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerUser.user.id).single();
  if (roleData?.role !== "admin") return null;
  return callerUser.user;
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
    const { action, username, password, fullName, profileId, role: targetRole } = await req.json();

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

      // Check if account is suspended
      const { data: profileData } = await supabase.from("profiles").select("is_active").eq("user_id", data.user.id).single();
      if (profileData && profileData.is_active === false) {
        await anonClient.auth.signOut();
        return new Response(JSON.stringify({ error: "Hesabınız admin tarafından dondurulmuştur." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      clearFailedAttempts(username);
      return new Response(JSON.stringify({ session: data.session, user: data.user }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Create student (admin only)
    if (action === "create-student") {
      const admin = await verifyAdmin(req, supabase, supabaseUrl);
      if (!admin) {
        return new Response(JSON.stringify({ error: "Sadece adminler öğrenci oluşturabilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı ve şifre gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!isUsernameValid(username)) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir (en az 2 karakter)." }), {
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

    // Create coach (admin only)
    if (action === "create-coach") {
      const admin = await verifyAdmin(req, supabase, supabaseUrl);
      if (!admin) {
        return new Response(JSON.stringify({ error: "Sadece adminler koç oluşturabilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı ve şifre gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!isUsernameValid(username)) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir (en az 2 karakter)." }), {
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
        console.error('Coach creation error:', createErr);
        if (createErr.message.includes("already been registered")) {
          return new Response(JSON.stringify({ error: "Bu kullanıcı adı zaten mevcut." }), {
            status: 409, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Koç oluşturulamadı." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Update role to 'koc' and mark profile as completed
      if (newUser?.user) {
        await supabase.from("user_roles").update({ role: "koc" }).eq("user_id", newUser.user.id);
        await supabase.from("profiles").update({ profile_completed: true, full_name: fullName || username }).eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ success: true, userId: newUser?.user?.id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Delete user (admin only) - works for both students and coaches
    if (action === "delete-student" || action === "delete-user") {
      const admin = await verifyAdmin(req, supabase, supabaseUrl);
      if (!admin) {
        return new Response(JSON.stringify({ error: "Sadece adminler kullanıcı silebilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (!profileId) {
        return new Response(JSON.stringify({ error: "Profil ID gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: profileData, error: profileErr } = await supabase.from("profiles").select("user_id").eq("id", profileId).single();
      if (profileErr || !profileData) {
        return new Response(JSON.stringify({ error: "Kullanıcı bulunamadı." }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: targetRoleData } = await supabase.from("user_roles").select("role").eq("user_id", profileData.user_id).single();
      if (targetRoleData?.role === "admin") {
        return new Response(JSON.stringify({ error: "Admin hesabı silinemez." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // If deleting a coach, unassign all their students first
      if (targetRoleData?.role === "koc") {
        await supabase.from("profiles").update({ coach_id: null, coach_selected: false }).eq("coach_id", profileId);
      }

      const { error: deleteErr } = await supabase.auth.admin.deleteUser(profileData.user_id);
      if (deleteErr) {
        console.error("Delete user error:", deleteErr);
        return new Response(JSON.stringify({ error: "Kullanıcı silinemedi." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Assign student to coach (admin only) - unused, handled client-side
    if (action === "assign-coach") {
      const admin = await verifyAdmin(req, supabase, supabaseUrl);
      if (!admin) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const studentProfileId = profileId;
      const coachProfileId = targetRole; // reuse existing destructured field

      if (!studentProfileId) {
        return new Response(JSON.stringify({ error: "Öğrenci profil ID gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const coachId = coachProfileId === "none" ? null : coachProfileId || null;
      const { error: assignErr } = await supabase.from("profiles").update({
        coach_id: coachId,
        coach_selected: coachId ? true : false,
      }).eq("id", studentProfileId);

      if (assignErr) {
        console.error('Koç ataması hatası:', assignErr);
        return new Response(JSON.stringify({ error: "Koç ataması başarısız. Lütfen tekrar deneyin." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
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