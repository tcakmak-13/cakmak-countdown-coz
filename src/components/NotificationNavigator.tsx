import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';

/**
 * Component that handles navigation from push notification clicks
 * Must be placed inside BrowserRouter
 */
export default function NotificationNavigator() {
  useNotificationNavigation();
  return null;
}
