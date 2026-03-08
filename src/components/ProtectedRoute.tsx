import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';

interface Props {
  children: ReactNode;
  requiredRole?: AppRole;
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />;

  // Student-specific redirects
  if (role === 'student' && profile) {
    // Force onboarding if profile not completed
    if (!profile.profile_completed && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    // Force coach selection if profile completed but coach not selected
    if (profile.profile_completed && !profile.coach_selected && location.pathname !== '/select-coach') {
      return <Navigate to="/select-coach" replace />;
    }
    // Redirect away from onboarding/coach-select if already done
    if (profile.profile_completed && location.pathname === '/onboarding') {
      return <Navigate to={profile.coach_selected ? '/student' : '/select-coach'} replace />;
    }
    if (profile.coach_selected && location.pathname === '/select-coach') {
      return <Navigate to="/student" replace />;
    }
  }

  return <>{children}</>;
}