import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CenteredSkeleton } from './SkeletonLoader';

/**
 * ProtectedRoute — wraps routes that require a specific role.
 *
 * Props:
 *   allowedRoles  – array of roles that may access this route, e.g. ['customer']
 *   children      – the element to render when authorised
 *
 * Behaviour:
 *   - Not initialised yet → spinner
 *   - Not logged in       → redirect to /login
 *   - Wrong role          → redirect to that role's own dashboard (or / for customers)
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, initialized } = useAuth();

  if (!initialized) {
    return <CenteredSkeleton minHeight="100vh" />;
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → send to their own home
  if (!allowedRoles.includes(user.role)) {
    const roleHome = {
      customer: '/',
      owner: '/owner/dashboard',
      warehouse: '/warehouse/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={roleHome[user.role] || '/'} replace />;
  }

  return children;
}
