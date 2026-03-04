import { useState, useEffect, useRef } from 'react';
import { Bell, Mail, BarChart3, CheckCircle, Megaphone, Calendar, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  icon: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

const iconMap: Record<string, typeof Bell> = {
  mail: Mail,
  chart: BarChart3,
  check: CheckCircle,
  megaphone: Megaphone,
  calendar: Calendar,
  bell: Bell,
};

const typeColors: Record<string, string> = {
  message: 'bg-blue-500/20 text-blue-400',
  exam: 'bg-purple-500/20 text-purple-400',
  success: 'bg-green-500/20 text-green-400',
  announcement: 'bg-amber-500/20 text-amber-400',
  schedule: 'bg-cyan-500/20 text-cyan-400',
  info: 'bg-primary/20 text-primary',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setNotifications(data as Notification[]);
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev].slice(0, 30));
        // Show toast
        const Icon = iconMap[n.icon] || Bell;
        toast(n.title, {
          description: n.message,
          duration: 5000,
          action: n.link ? {
            label: 'Görüntüle',
            onClick: () => {
              if (n.link) {
                if (n.link.startsWith('/')) navigate(n.link);
              }
            },
          } : undefined,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.link) {
      setOpen(false);
      if (n.link.startsWith('/')) navigate(n.link);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-orange"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display font-semibold text-base">Bildirimler</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Tümünü oku
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[55vh] divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Henüz bildirim yok</p>
                </div>
              ) : (
                notifications.map(n => {
                  const Icon = iconMap[n.icon] || Bell;
                  const colorClass = typeColors[n.type] || typeColors.info;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/50 ${
                        !n.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold truncate ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: tr })}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
