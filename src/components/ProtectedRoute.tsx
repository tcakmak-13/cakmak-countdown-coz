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
    if (!profile.profile_completed && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    if (profile.profile_completed && !profile.coach_selected && location.pathname !== '/select-coach') {
      return <Navigate to="/select-coach" replace />;
    }
    if (profile.profile_completed && location.pathname === '/onboarding') {
      return <Navigate to={profile.coach_selected ? '/student' : '/select-coach'} replace />;
    }
    if (profile.coach_selected && location.pathname === '/select-coach') {
      return <Navigate to="/student" replace />;
    }
  }

  // Coach-specific redirects
  if (role === 'koc' && profile) {
    if (!profile.profile_completed && location.pathname !== '/coach-onboarding') {
      return <Navigate to="/coach-onboarding" replace />;
    }
    if (profile.profile_completed && location.pathname === '/coach-onboarding') {
      return <Navigate to="/coach" replace />;
    }
  }

  return <>{children}</>;
}