import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import WarehouseNavbar from './WarehouseNavbar';

export default function WarehouseLayout() {
  const { user, initialized } = useAuth();

  // Show loading spinner while initializing
  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F3F4F6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #e0e0e0', borderTop: '4px solid #F97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#666', fontSize: '14px' }}>Initializing...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
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
