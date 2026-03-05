import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const currentDay = istNow.getDay();
  const currentHour = istNow.getHours();
  const currentMinute = istNow.getMinutes();

  // Get all active recurring approved appointments
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, student_id, type, recurring_day, recurring_time, profiles!appointments_student_id_fkey(user_id, full_name)")
    .eq("status", "approved")
    .eq("recurring", true)
    .is("series_ended_at", null)
    .eq("recurring_day", currentDay);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get admin user_id
  const { data: adminData } = await supabase.rpc("get_admin_profile_info");
  const adminProfileId = adminData?.[0]?.id;
  // Get admin user_id from user_roles
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1);
  const adminUserId = adminRoles?.[0]?.user_id;

  let sentCount = 0;

  for (const appt of appointments || []) {
    if (!appt.recurring_time) continue;
    const [apptHour, apptMinute] = appt.recurring_time.split(":").map(Number);

    const diffMinutes = (apptHour - currentHour) * 60 + (apptMinute - currentMinute);
    const typeLabel = appt.type === "video" ? "Görüntülü" : "Sesli";
    const studentProfile = appt.profiles as any;
    const studentUserId = studentProfile?.user_id;
    const studentName = studentProfile?.full_name || "Öğrenci";

    // 15-minute reminder
    if (diffMinutes >= 13 && diffMinutes <= 17) {
      // Notify student
      if (studentUserId) {
        await supabase.from("notifications").insert({
          user_id: studentUserId,
          title: "Görüşme 15 Dakika Sonra! ⏰",
          message: `${typeLabel} görüşmeniz 15 dakika sonra başlayacak.`,
          type: "appointment",
          icon: "clock",
        });
        sentCount++;
      }
      // Notify admin
      if (adminUserId) {
        await supabase.from("notifications").insert({
          user_id: adminUserId,
          title: "Görüşme 15 Dakika Sonra! ⏰",
          message: `${studentName} ile ${typeLabel.toLowerCase()} görüşmeniz 15 dakika sonra.`,
          type: "appointment",
          icon: "clock",
        });
        sentCount++;
      }
    }

    // On-time reminder
    if (diffMinutes >= -2 && diffMinutes <= 2) {
      if (studentUserId) {
        await supabase.from("notifications").insert({
          user_id: studentUserId,
          title: "Görüşme Vaktin Geldi! 🎯",
          message: `${typeLabel} görüşmeniz şimdi başlıyor!`,
          type: "appointment",
          icon: "calendar",
        });
        sentCount++;
      }
      if (adminUserId) {
        await supabase.from("notifications").insert({
          user_id: adminUserId,
          title: "Görüşme Vaktin Geldi! 🎯",
          message: `${studentName} ile ${typeLabel.toLowerCase()} görüşmeniz şimdi!`,
          type: "appointment",
          icon: "calendar",
        });
        sentCount++;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, checked: appointments?.length ?? 0, sent: sentCount }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
