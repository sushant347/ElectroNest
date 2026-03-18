import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, ScrollText, BarChart3, LogOut, Shield, ChevronDown } from 'lucide-react';
import electronestLogo from '../images/Electronest.png';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

const adminLinks = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'User Management', path: '/admin/users', icon: Users },
  { label: 'Supplier Management', path: '/admin/suppliers', icon: Truck },
  { label: 'System Logs', path: '/admin/logs', icon: ScrollText },
  { label: 'Analytics Summary', path: '/admin/analytics', icon: BarChart3 },
];

export default function AdminNavbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : 'System Admin';
  const avatarInitial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'A';
  const displayEmail = user?.email || '';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-inner">
          <div className="adm-topbar-left">
            <Shield size={13} />
            <span>ElectroNest Admin Panel</span>
          </div>
          <div className="adm-topbar-right">
            <span className="adm-store-status"><span className="adm-status-dot" /> System Online</span>
          </div>
        </div>
      </div>

      <nav className="adm-navbar">
        <div className="adm-navbar-inner">
          <Link to="/admin/dashboard" className="adm-nav-logo">
            <img src={electronestLogo} alt="ElectroNest" className="adm-nav-logo-img" />
            <div className="adm-nav-logo-text">
              <span className="adm-nav-logo-name">Electro<span className="adm-nav-accent">Nest</span></span>
              <span className="adm-nav-logo-sub">Admin Console</span>
            </div>
          </Link>

          <div className="adm-nav-links">
            {adminLinks.map(link => {
              const Icon = link.icon;
              const isActive = pathname === link.path || (link.path !== '/admin/dashboard' && pathname.startsWith(link.path));
              return (
                <Link key={link.path} to={link.path} className={`adm-nav-link${isActive ? ' active' : ''}`}>
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="adm-nav-right" ref={menuRef}>
            <button className="adm-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="adm-user-avatar">{avatarInitial}</div>
              <div className="adm-user-info-nav">
                <span className="adm-user-name-nav">{displayName}</span>
                <span className="adm-user-role-nav">Administrator</span>
              </div>
              <ChevronDown size={14} className={`adm-chevron${showUserMenu ? ' open' : ''}`} />
            </button>
            {showUserMenu && (
              <div className="adm-user-dropdown">
                <div className="adm-dropdown-header">
                  <div className="adm-dropdown-avatar">{avatarInitial}</div>
                  <div>
                    <div className="adm-dropdown-name">{displayName}</div>
                    <div className="adm-dropdown-email">{displayEmail}</div>
                  </div>
                </div>
                <div className="adm-dropdown-divider" />
                <button className="adm-dropdown-item adm-logout-btn" onClick={handleLogout}>
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <style>{`
        .adm-topbar {
          background: #7F1D1D;
          color: rgba(255,255,255,0.85);
          font-size: 12px;
          height: 28px;
          display: flex;
          align-items: center;
        }
        .adm-topbar-inner {
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          padding: 0 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .adm-topbar-left {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }
        .adm-topbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .adm-store-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .adm-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          display: inline-block;
          box-shadow: 0 0 6px #4ade80;
        }
        .adm-navbar {
          background: #1C1917;
          border-bottom: 2px solid #DC2626;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .adm-navbar-inner {
          max-width: 1440px;
          margin: 0 auto;
          padding: 0 32px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .adm-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .adm-nav-logo-img {
          height: 32px;
          width: auto;
          object-fit: contain;
          display: block;
          flex-shrink: 0;
        }
        .adm-nav-logo-text {
          display: flex;
          flex-direction: column;
        }
        .adm-nav-logo-name {
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          line-height: 1.1;
        }
        .adm-nav-accent { color: #EF4444; }
        .adm-nav-logo-sub {
          color: rgba(255,255,255,0.5);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .adm-nav-links {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          justify-content: center;
        }
        .adm-nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .adm-nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }
        .adm-nav-link.active {
          color: #fff;
          background: rgba(220, 38, 38, 0.2);
          border: 1px solid rgba(220, 38, 38, 0.3);
        }
        .adm-nav-right {
          position: relative;
          flex-shrink: 0;
        }
        .adm-user-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: #fff;
        }
        .adm-user-btn:hover {
          background: rgba(255,255,255,0.1);
        }
        .adm-user-avatar {
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
        }
        .adm-user-info-nav {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .adm-user-name-nav {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
        }
        .adm-user-role-nav {
          font-size: 10px;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .adm-chevron {
          color: rgba(255,255,255,0.5);
          transition: transform 0.2s;
        }
        .adm-chevron.open { transform: rotate(180deg); }
        .adm-user-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 240px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          z-index: 200;
          animation: admDropIn 0.2s ease;
        }
        @keyframes admDropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .adm-dropdown-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
        }
        .adm-dropdown-avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #DC2626, #991B1B);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
          color: #fff;
        }
        .adm-dropdown-name {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
        }
        .adm-dropdown-email {
          font-size: 12px;
          color: #94a3b8;
        }
        .adm-dropdown-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 0 12px;
        }
        .adm-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          color: #64748b;
          transition: all 0.15s;
        }
        .adm-dropdown-item:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .adm-logout-btn:hover {
          color: #ef4444;
          background: #fef2f2;
        }
      `}</style>
    </>
  );
}
