import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';

interface Props {
  children: ReactNode;
  requiredRole?: AppRole;
}

function getRoleHome(role: string | null, profile: any): string {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'admin') return '/admin';
  if (role === 'firm_admin') return '/firm';
  if (role === 'koc') return '/coach';
  if (role === 'student') {
    if (!profile?.profile_completed) return '/onboarding';
    if (!profile?.coach_selected) return '/select-coach';
    return '/student';
  }
  return '/login';
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

  // Super admin route protection: only tcakmak1355 can access
  if (requiredRole === 'super_admin') {
    if (role !== 'super_admin' || profile?.username !== 'tcakmak1355') {
      return <Navigate to={getRoleHome(role, profile)} replace />;
    }
  } else if (requiredRole && role !== requiredRole) {
    // super_admin can access admin routes too
    if (!(requiredRole === 'admin' && role === 'super_admin')) {
      return <Navigate to={getRoleHome(role, profile)} replace />;
    }
  }

  // Firm admin redirect
  if (role === 'firm_admin' && !requiredRole) {
    if (location.pathname !== '/firm') {
      return <Navigate to="/firm" replace />;
    }
  }

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

  // Coach-specific redirects: handled inside CoachDashboard and CoachOnboarding

  return <>{children}</>;
}