import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Requires authentication. Redirects to /login if not logged in.
 * If `allowedRole` is specified, also enforces role-based access:
 *   - "user"         → nutritionists are sent to /nutritionist/dashboard
 *   - "nutritionist" → users are sent to /dashboard
 */
export function ProtectedRoute({ children, allowedRole }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not logged in → login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role gate
  if (allowedRole) {
    if (allowedRole === 'user' && userRole === 'nutritionist') {
      return <Navigate to="/nutritionist/dashboard" replace />;
    }
    if (allowedRole === 'nutritionist' && userRole !== 'nutritionist') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

/**
 * Shorthand wrappers for cleaner route definitions.
 */
export function UserRoute({ children }) {
  return <ProtectedRoute allowedRole="user">{children}</ProtectedRoute>;
}

export function NutritionistRoute({ children }) {
  return <ProtectedRoute allowedRole="nutritionist">{children}</ProtectedRoute>;
}
