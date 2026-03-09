import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting engagement notifications check...');

    // Check for inactive students (48 hours without deneme entry)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    // Get all student profiles
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name')
      .eq('coach_selected', true)
      .not('coach_id', 'is', null);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      throw studentsError;
    }

    console.log(`Found ${students?.length || 0} students to check`);

    // Check each student for inactivity
    for (const student of students || []) {
      // Check last deneme entry
      const { data: recentDeneme } = await supabase
        .from('deneme_results')
        .select('created_at')
        .eq('student_id', student.id)
        .gte('created_at', fortyEightHoursAgo)
        .limit(1);

      // If no recent deneme, check if notification already sent
      if (!recentDeneme || recentDeneme.length === 0) {
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', student.user_id)
          .eq('type', 'inactivity_warning')
          .gte('created_at', fortyEightHoursAgo)
          .limit(1);

        // Send notification if not already sent
        if (!existingNotif || existingNotif.length === 0) {
          await supabase.from('notifications').insert({
            user_id: student.user_id,
            title: 'Deneme Girişi Hatırlatması',
            message: `Merhaba ${student.full_name}! Son 48 saattir deneme sonucu girmedin. Performansını takip etmek için deneme sonuçlarını düzenli olarak girmeyi unutma! 📊`,
            type: 'inactivity_warning',
            icon: 'megaphone',
            link: '/student',
          });
          console.log(`Sent inactivity notification to ${student.full_name}`);
        }
      }

      // Check for unread messages older than 3 hours
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      
      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select('id, sender_id, created_at')
        .eq('receiver_id', student.id)
        .eq('read', false)
        .lt('created_at', threeHoursAgo);

      if (unreadMessages && unreadMessages.length > 0) {
        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', student.user_id)
          .eq('type', 'unread_message_reminder')
          .gte('created_at', threeHoursAgo)
          .limit(1);

        if (!existingReminder || existingReminder.length === 0) {
          await supabase.from('notifications').insert({
            user_id: student.user_id,
            title: 'Okunmamış Mesajların Var',
            message: `${unreadMessages.length} adet okunmamış mesajın var! Koçundan gelen mesajları kontrol et. 💬`,
            type: 'unread_message_reminder',
            icon: 'mail',
            link: '/student',
          });
          console.log(`Sent unread message reminder to ${student.full_name}`);
        }
      }
    }

    console.log('Engagement notifications check completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Engagement notifications processed',
        studentsChecked: students?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in engagement-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
