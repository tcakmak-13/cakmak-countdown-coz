import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  children: ReactNode;
  requiredRole?: 'admin' | 'student';
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
  if (role === 'student' && profile && !profile.profile_completed) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }
  if (role === 'student' && profile && profile.profile_completed && location.pathname === '/onboarding') {
    return <Navigate to="/student" replace />;
  }

  return <>{children}</>;
}
