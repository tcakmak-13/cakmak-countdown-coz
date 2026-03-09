import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to handle navigation from push notification clicks
 * Listens for service worker messages and navigates in-app
 */
export function useNotificationNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        const targetUrl = event.data.url;
        
        // If not authenticated and trying to access protected route
        if (!user && !loading) {
          // Store intended destination and redirect to login
          sessionStorage.setItem('notification_redirect', targetUrl);
          navigate('/login');
          return;
        }

        // Navigate to target URL
        if (targetUrl !== location.pathname + location.search) {
          navigate(targetUrl);
        }
      }
    };

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Check for pending notification redirect after login
    if (user && !loading) {
      const pendingRedirect = sessionStorage.getItem('notification_redirect');
      if (pendingRedirect) {
        sessionStorage.removeItem('notification_redirect');
        navigate(pendingRedirect);
      }
    }

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [navigate, location, user, loading]);
}
