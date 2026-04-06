import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import WarehouseNavbar from './WarehouseNavbar';
import { CenteredSkeleton } from '../Common/SkeletonLoader';

export default function WarehouseLayout() {
  const { user, initialized } = useAuth();

  // Show loading spinner while initializing
  if (!initialized) {
    return <CenteredSkeleton minHeight="100vh" />;
  }

  // Only allow the warehouse role
  if (!user || user.role !== 'warehouse') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="warehouse-layout">
      <WarehouseNavbar />
      <main className="warehouse-main-content">
        <Outlet />
      </main>
      <style>{`
        .warehouse-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #F3F4F6;
        }
        .warehouse-main-content {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
