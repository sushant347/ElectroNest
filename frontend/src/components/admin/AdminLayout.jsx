import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Store, ScrollText, BarChart3, LogOut,
  Shield, Menu, X, ChevronRight, Tag, MessageSquare
} from 'lucide-react';

const navLinks = [
  { label: 'Dashboard',       path: '/admin/dashboard',  icon: LayoutDashboard, color: '#DC2626' },
  { label: 'User Management', path: '/admin/users',      icon: Users,           color: '#DC2626' },
  { label: 'Stores',          path: '/admin/stores',     icon: Store,           color: '#F97316' },
  { label: 'Global Coupons',  path: '/admin/coupons',    icon: Tag,             color: '#7C3AED' },
  { label: 'User Query',      path: '/admin/queries',    icon: MessageSquare,   color: '#EA580C' },
  { label: 'System Logs',     path: '/admin/logs',       icon: ScrollText,      color: '#2563EB' },
  { label: 'Analytics',       path: '/admin/analytics',  icon: BarChart3,       color: '#16A34A' },
];

export default function AdminLayout() {
  const { user, initialized, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F3F4F6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, border: '4px solid #e0e0e0', borderTop: '4px solid #DC2626', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#666', fontSize: 14 }}>Initializing...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : 'System Admin';
  const avatarInitial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'A';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="adm-sidebar-inner">
      {/* Logo */}
      <div className="adm-sidebar-logo">
        <Link to="/admin/dashboard" className="adm-logo-link">
          <div className="adm-logo-icon">
            <Shield size={18} color="#fff" />
          </div>
          {sidebarOpen && (
            <div className="adm-logo-text">
              <span className="adm-logo-name">Electro<span style={{ color: '#EF4444' }}>Nest</span></span>
              <span className="adm-logo-sub">Admin Console</span>
            </div>
          )}
        </Link>
        <button
          className="adm-sidebar-toggle"
          onClick={() => setSidebarOpen(o => !o)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronRight size={16} style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* System status pill */}
      {sidebarOpen && (
        <div className="adm-sidebar-status">
          <div className="adm-status-dot-anim" />
          <span>System Online</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="adm-sidebar-nav">
        {sidebarOpen && <div className="adm-nav-section-label">Navigation</div>}
        {navLinks.map(link => {
          const Icon = link.icon;
          const isActive = pathname === link.path || (link.path !== '/admin/dashboard' && pathname.startsWith(link.path));
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`adm-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={!sidebarOpen ? link.label : undefined}
              style={isActive ? { '--nav-color': link.color } : {}}
            >
              <div className="adm-nav-icon" style={isActive ? { color: link.color, background: `${link.color}18` } : {}}>
                <Icon size={18} />
              </div>
              {sidebarOpen && <span className="adm-nav-label">{link.label}</span>}
              {isActive && sidebarOpen && <div className="adm-nav-active-bar" style={{ background: link.color }} />}
            </Link>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div className="adm-sidebar-footer">
        <div className={`adm-user-card ${!sidebarOpen ? 'collapsed' : ''}`}>
          <div className="adm-user-ava">{avatarInitial}</div>
          {sidebarOpen && (
            <div className="adm-user-info">
              <div className="adm-user-name">{displayName}</div>
              <div className="adm-user-role">Administrator</div>
            </div>
          )}
          {sidebarOpen && (
            <button className="adm-logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={16} />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <button className="adm-logout-icon-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        )}
        {sidebarOpen && (
          <div className="adm-sidebar-email">{user?.email}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="adm-layout">
      {/* Desktop Sidebar */}
      <aside className={`adm-sidebar ${sidebarOpen ? 'expanded' : 'collapsed'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay Sidebar */}
      {mobileOpen && (
        <div className="adm-mobile-overlay" onClick={() => setMobileOpen(false)}>
          <aside className="adm-mobile-sidebar" onClick={e => e.stopPropagation()}>
            <button className="adm-mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`adm-main ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        {/* Top Bar */}
        <header className="adm-topbar">
          <button className="adm-mobile-menu-btn" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="adm-topbar-breadcrumb">
            {navLinks.find(l => pathname === l.path || (l.path !== '/admin/dashboard' && pathname.startsWith(l.path)))?.label || 'Dashboard'}
          </div>
          <div className="adm-topbar-right">
            <div className="adm-topbar-user">
              <div className="adm-topbar-ava">{avatarInitial}</div>
              <div className="adm-topbar-name">{displayName}</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="adm-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        .adm-layout {
          display: flex;
          min-height: 100vh;
          background: #F3F4F6;
        }

        /* ── Sidebar ── */
        .adm-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          background: #1C1917;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          transition: width 0.25s ease;
          z-index: 200;
          overflow: hidden;
        }
        .adm-sidebar.expanded { width: 240px; }
        .adm-sidebar.collapsed { width: 64px; }

        .adm-sidebar-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 0;
        }

        /* Logo */
        .adm-sidebar-logo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          gap: 10px;
          min-height: 64px;
        }
        .adm-logo-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex: 1;
          overflow: hidden;
        }
        .adm-logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #DC2626, #991B1B);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .adm-logo-text { display: flex; flex-direction: column; overflow: hidden; }
        .adm-logo-name { color: #fff; font-weight: 700; font-size: 15px; white-space: nowrap; }
        .adm-logo-sub { color: rgba(255,255,255,0.4); font-size: 9px; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; }

        .adm-sidebar-toggle {
          background: rgba(255,255,255,0.06);
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .adm-sidebar-toggle:hover { background: rgba(255,255,255,0.12); color: #fff; }

        /* Status */
        .adm-sidebar-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .adm-status-dot-anim {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px #4ade80;
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* Nav */
        .adm-sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }
        .adm-nav-section-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0 8px 8px;
        }
        .adm-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 10px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 500;
          transition: all 0.15s;
          position: relative;
          overflow: hidden;
        }
        .adm-nav-item:hover {
          color: #fff;
          background: rgba(255,255,255,0.07);
        }
        .adm-nav-item.active {
          color: #fff;
          background: rgba(255,255,255,0.1);
        }
        .adm-nav-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: rgba(255,255,255,0.5);
          transition: all 0.15s;
        }
        .adm-nav-item:hover .adm-nav-icon { color: #fff; }
        .adm-nav-label { flex: 1; white-space: nowrap; }
        .adm-nav-active-bar {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          border-radius: 3px 0 0 3px;
        }

        /* Footer */
        .adm-sidebar-footer {
          padding: 12px 8px;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .adm-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
        }
        .adm-user-card.collapsed { justify-content: center; }
        .adm-user-ava {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #DC2626, #991B1B);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: #fff;
          flex-shrink: 0;
        }
        .adm-user-info { flex: 1; overflow: hidden; }
        .adm-user-name { font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-user-role { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
        .adm-logout-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .adm-logout-btn:hover { background: rgba(220,38,38,0.2); color: #EF4444; }
        .adm-logout-icon-btn {
          background: rgba(255,255,255,0.05);
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          width: 100%;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .adm-logout-icon-btn:hover { background: rgba(220,38,38,0.2); color: #EF4444; }
        .adm-sidebar-email { font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; padding: 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ── Mobile ── */
        .adm-mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 300;
          display: none;
        }
        .adm-mobile-sidebar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 240px;
          background: #1C1917;
        }
        .adm-mobile-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }

        /* ── Top Bar ── */
        .adm-topbar {
          height: 56px;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .adm-mobile-menu-btn {
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          display: none;
          padding: 4px;
          border-radius: 6px;
        }
        .adm-topbar-breadcrumb {
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          flex: 1;
        }
        .adm-topbar-right { display: flex; align-items: center; gap: 12px; }
        .adm-topbar-user { display: flex; align-items: center; gap: 8px; }
        .adm-topbar-ava {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #DC2626, #991B1B);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          color: #fff;
        }
        .adm-topbar-name { font-size: 13px; font-weight: 600; color: #374151; }

        /* ── Main Content ── */
        .adm-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          transition: margin-left 0.25s ease;
        }
        .adm-main.sidebar-expanded { margin-left: 240px; }
        .adm-main.sidebar-collapsed { margin-left: 64px; }
        .adm-content { flex: 1; overflow-x: clip; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .adm-sidebar { display: none; }
          .adm-mobile-overlay { display: block; }
          .adm-mobile-menu-btn { display: flex; }
          .adm-main.sidebar-expanded,
          .adm-main.sidebar-collapsed { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
