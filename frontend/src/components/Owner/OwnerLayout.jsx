import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OwnerNavbar from './OwnerNavbar';
import { CenteredSkeleton } from '../Common/SkeletonLoader';

export default function OwnerLayout() {
  const { user, initialized } = useAuth();

  // Show loading spinner while initializing
  if (!initialized) {
    return <CenteredSkeleton minHeight="100vh" />;
  }

  // Only allow the owner role
  if (!user || user.role !== 'owner') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="owner-layout">
      <OwnerNavbar />
      <main className="owner-main-content">
        <Outlet />
      </main>
      <style>{`
        .owner-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #F3F4F6;
        }
        .owner-main-content {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
