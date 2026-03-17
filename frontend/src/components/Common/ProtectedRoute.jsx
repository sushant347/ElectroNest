import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F3F4F6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #e0e0e0', borderTop: '4px solid #F97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#666', fontSize: '14px' }}>Loading...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
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
