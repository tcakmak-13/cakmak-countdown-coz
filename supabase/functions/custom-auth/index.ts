import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPER_ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME")!;
const SUPER_ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;
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
  return /^[a-zA-Z0-9çÇğĞıİöÖşŞüÜ._-]+$/.test(username) && username.length >= 2 && username.length <= 50;
}

async function verifyCaller(req: Request, supabase: any, supabaseUrl: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerUser } = await callerClient.auth.getUser();
  if (!callerUser?.user) return null;
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerUser.user.id).single();
  if (!roleData || !["super_admin", "firm_admin"].includes(roleData.role)) return null;
  return { user: callerUser.user, role: roleData.role as string };
}

async function getCallerCompanyId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("company_id").eq("user_id", userId).single();
  return data?.company_id || null;
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
    const { action, username, password, fullName, profileId, role: targetRole, companyId } = await req.json();

    // ─── LOGIN ───
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

      // Auto-create super_admin account for tcakmak1355
      if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const adminExists = existing?.users?.some((u: any) => u.email === email);

        if (!adminExists) {
          const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email,
            password: SUPER_ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: "Süper Admin", username: SUPER_ADMIN_USERNAME },
          });
          if (createErr) {
            console.error('Super admin creation error:', createErr);
            return new Response(JSON.stringify({ error: "Süper Admin hesabı oluşturulamadı." }), {
              status: 500, headers: { ...cors, "Content-Type": "application/json" },
            });
          }
          if (newUser?.user) {
            await supabase.from("user_roles").update({ role: "super_admin" }).eq("user_id", newUser.user.id);
            await supabase.from("profiles").update({ profile_completed: true, full_name: "Süper Admin", is_approved: true }).eq("user_id", newUser.user.id);
          }
        } else {
          // Ensure existing account has super_admin role
          const existingUser = existing?.users?.find((u: any) => u.email === email);
          if (existingUser) {
            const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", existingUser.id).single();
            if (roleData && roleData.role !== "super_admin") {
              await supabase.from("user_roles").update({ role: "super_admin" }).eq("user_id", existingUser.id);
            }
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
      const { data: profileData } = await supabase.from("profiles").select("is_active, is_approved").eq("user_id", data.user.id).single();
      if (profileData && profileData.is_active === false) {
        await anonClient.auth.signOut();
        return new Response(JSON.stringify({ error: "Hesabınız yönetici tarafından dondurulmuştur." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Check if account is pending approval
      if (profileData && profileData.is_approved === false) {
        await anonClient.auth.signOut();
        return new Response(JSON.stringify({ error: "Hesabınız henüz onaylanmamıştır. Lütfen Süper Admin onayını bekleyin." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      clearFailedAttempts(username);
      return new Response(JSON.stringify({ session: data.session, user: data.user }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE STUDENT (firm_admin or super_admin) ───
    if (action === "create-student") {
      const caller = await verifyCaller(req, supabase, supabaseUrl);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
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

      if (newUser?.user) {
        const callerCompanyId = await getCallerCompanyId(supabase, caller.user.id);
        const isFirmAdmin = caller.role === "firm_admin";
        const updateData: any = { full_name: fullName || username };
        if (callerCompanyId) updateData.company_id = callerCompanyId;
        // firm_admin created users need super_admin approval
        if (isFirmAdmin) {
          updateData.is_approved = false;
        }
        await supabase.from("profiles").update(updateData).eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ success: true, userId: newUser?.user?.id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE COACH (firm_admin or super_admin) ───
    if (action === "create-coach") {
      const caller = await verifyCaller(req, supabase, supabaseUrl);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
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

      if (newUser?.user) {
        await supabase.from("user_roles").update({ role: "koc" }).eq("user_id", newUser.user.id);
        const callerCompanyId = await getCallerCompanyId(supabase, caller.user.id);
        const isFirmAdmin = caller.role === "firm_admin";
        const updateData: any = { profile_completed: true, full_name: fullName || username };
        if (callerCompanyId) updateData.company_id = callerCompanyId;
        if (isFirmAdmin) {
          updateData.is_approved = false;
        }
        await supabase.from("profiles").update(updateData).eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ success: true, userId: newUser?.user?.id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── DELETE USER ───
    if (action === "delete-student" || action === "delete-user") {
      const caller = await verifyCaller(req, supabase, supabaseUrl);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
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
      if (targetRoleData?.role === "super_admin" || targetRoleData?.role === "firm_admin") {
        return new Response(JSON.stringify({ error: "Yönetici hesabı silinemez." }), {
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

    // ─── ASSIGN COACH ───
    if (action === "assign-coach") {
      const caller = await verifyCaller(req, supabase, supabaseUrl);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const studentProfileId = profileId;
      const coachProfileId = targetRole;

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
        return new Response(JSON.stringify({ error: "Koç ataması başarısız." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── TOGGLE ACTIVE ───
    if (action === "toggle-active") {
      const caller = await verifyCaller(req, supabase, supabaseUrl);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Profil ID gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: targetProfile, error: profileErr } = await supabase.from("profiles").select("is_active, user_id").eq("id", profileId).single();
      if (profileErr || !targetProfile) {
        return new Response(JSON.stringify({ error: "Kullanıcı bulunamadı." }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: targetRoleData } = await supabase.from("user_roles").select("role").eq("user_id", targetProfile.user_id).single();
      if (targetRoleData?.role === "super_admin" || targetRoleData?.role === "firm_admin") {
        return new Response(JSON.stringify({ error: "Yönetici hesabı dondurulamaz." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const newStatus = !targetProfile.is_active;
      const { error: updateErr } = await supabase.from("profiles").update({ is_active: newStatus }).eq("id", profileId);
      if (updateErr) {
        return new Response(JSON.stringify({ error: "İşlem başarısız." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, is_active: newStatus }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── APPROVE USER (super_admin only) ───
    if (action === "approve-user") {
      const result = await verifyCaller(req, supabase, supabaseUrl);
      if (!result || result.role !== "super_admin") {
        return new Response(JSON.stringify({ error: "Sadece Süper Admin kullanıcıları onaylayabilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Profil ID gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { error: updateErr } = await supabase.from("profiles").update({ is_approved: true }).eq("id", profileId);
      if (updateErr) {
        return new Response(JSON.stringify({ error: "Onaylama işlemi başarısız." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── REJECT USER (super_admin only) ───
    if (action === "reject-user") {
      const result = await verifyCaller(req, supabase, supabaseUrl);
      if (!result || result.role !== "super_admin") {
        return new Response(JSON.stringify({ error: "Sadece Süper Admin kullanıcıları reddedebilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!profileId) {
        return new Response(JSON.stringify({ error: "Profil ID gerekli." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: profileData } = await supabase.from("profiles").select("user_id").eq("id", profileId).single();
      if (!profileData) {
        return new Response(JSON.stringify({ error: "Kullanıcı bulunamadı." }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(profileData.user_id);
      if (deleteErr) {
        return new Response(JSON.stringify({ error: "Kullanıcı silinemedi." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE FIRM ADMIN (super_admin only) ───
    if (action === "create-firm-admin") {
      const result = await verifyCaller(req, supabase, supabaseUrl);
      if (!result || result.role !== "super_admin") {
        return new Response(JSON.stringify({ error: "Sadece Süper Admin firma yöneticisi oluşturabilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (!username || !password || !companyId) {
        return new Response(JSON.stringify({ error: "Kullanıcı adı, şifre ve firma ID gerekli." }), {
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
        console.error('Firm admin creation error:', createErr);
        if (createErr.message.includes("already been registered")) {
          return new Response(JSON.stringify({ error: "Bu kullanıcı adı zaten mevcut." }), {
            status: 409, headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Yönetici oluşturulamadı." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (newUser?.user) {
        await supabase.from("user_roles").update({ role: "firm_admin" }).eq("user_id", newUser.user.id);
        await supabase.from("profiles").update({
          profile_completed: true,
          full_name: fullName || username,
          company_id: companyId,
          is_approved: true,
        }).eq("user_id", newUser.user.id);
      }

      return new Response(JSON.stringify({ success: true, userId: newUser?.user?.id }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── CHANGE PASSWORD (firm_admin only) ───
    if (action === "change-password") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: callerUser } = await callerClient.auth.getUser();
      if (!callerUser?.user) {
        return new Response(JSON.stringify({ error: "Oturum bulunamadı." }), {
          status: 401, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerUser.user.id).single();
      if (!roleData || roleData.role !== "firm_admin") {
        return new Response(JSON.stringify({ error: "Sadece firma yöneticileri şifre değiştirebilir." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (!password || !isPasswordStrong(password)) {
        return new Response(JSON.stringify({ error: "Yeni şifre en az 8 karakter olmalıdır." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const { error: updateErr } = await supabase.auth.admin.updateUserById(callerUser.user.id, { password });
      if (updateErr) {
        return new Response(JSON.stringify({ error: "Şifre değiştirilemedi." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ─── GET COMPANY USERS (firm_admin or super_admin) ───
    if (action === "get-company-users") {
      const caller = await verifyCaller(req, supabase, supabaseUrl);
      if (!caller) {
        return new Response(JSON.stringify({ error: "Yetkilendirme gerekli." }), {
          status: 403, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const callerCompanyId = await getCallerCompanyId(supabase, caller.user.id);
      if (!callerCompanyId) {
        return new Response(JSON.stringify({ error: "Firma bulunamadı." }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: companyProfiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, is_active, is_approved, area, grade, target_university, target_department, coach_id, user_id")
        .eq("company_id", callerCompanyId);

      if (profilesErr) {
        console.error("Get company users error:", profilesErr);
        return new Response(JSON.stringify({ error: "Kullanıcılar yüklenemedi." }), {
          status: 500, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // Get roles for all company users
      const userIds = (companyProfiles || []).map((p: any) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      const users = (companyProfiles || []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url,
        is_active: p.is_active,
        is_approved: p.is_approved,
        area: p.area,
        grade: p.grade,
        target_university: p.target_university,
        target_department: p.target_department,
        coach_id: p.coach_id,
        role: roleMap.get(p.user_id) || null,
      }));

      return new Response(JSON.stringify({ users }), {
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
