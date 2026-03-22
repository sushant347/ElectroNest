import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, LogOut, Bell, Store, ChevronDown, CheckCheck, AlertTriangle, ShoppingBag, Info, Trash2, Tag, Menu, X } from 'lucide-react';
import electronestLogo from '../images/Electronest.png';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ownerAPI } from '../../services/api';

const ownerLinks = [
  { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
  { label: 'Products', path: '/owner/products', icon: Package },
  { label: 'Orders', path: '/owner/orders', icon: ShoppingCart },
  { label: 'Analytics', path: '/owner/analytics', icon: BarChart3 },
  { label: 'Coupons', path: '/owner/coupons', icon: Tag },
];

const typeIcons = { low_stock: AlertTriangle, order_update: ShoppingBag, purchase_order: Package, general: Info };
const typeColors = { low_stock: '#D97706', order_update: '#3B82F6', purchase_order: '#7C3AED', general: '#6B7280' };

export default function OwnerNavbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : 'Owner';
  const avatarInitial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'O';
  const displayEmail = user?.email || '';

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await ownerAPI.getNotifications();
      setNotifications(res.data?.results || res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchNotifications(); const t = setInterval(fetchNotifications, 30000); return () => clearInterval(t); }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id) => {
    try { await ownerAPI.markNotificationRead(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); } catch { }
  };

  const markAllRead = async () => {
    try { await ownerAPI.markAllNotificationsRead(); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); } catch { }
  };

  const clearAll = async () => {
    try { await ownerAPI.clearAllNotifications(); setNotifications([]); } catch { }
  };

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => { setMobileOpen(false); logout(); navigate('/login'); };

  const relTime = (d) => {
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 60000) return 'Just now';
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
    return `${Math.floor(ms / 86400000)}d ago`;
  };

  return (
    <>
      <div className="owner-topbar">
        <div className="owner-topbar-inner">
          <div className="owner-topbar-left"><Store size={13} /><span>ElectroNest Owner Panel</span></div>
          <div className="owner-topbar-right"><span className="owner-store-status"><span className="status-dot" /> Store Online</span></div>
        </div>
      </div>

      <nav className="owner-navbar">
        <div className="owner-navbar-inner">
          <Link to="/owner/dashboard" className="owner-nav-logo">
            <img src={electronestLogo} alt="ElectroNest" className="owner-nav-logo-img" />
            <div className="owner-nav-logo-text">
              <span className="owner-nav-logo-name">Electro<span className="owner-nav-accent">Nest</span></span>
              <span className="owner-nav-logo-tag">Owner Panel</span>
            </div>
          </Link>

          <div className="owner-nav-links">
            {ownerLinks.map((link) => {
              const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
              return (
                <Link key={link.path} to={link.path} className={`owner-nav-link ${isActive ? 'active' : ''}`}>
                  <link.icon size={17} /><span>{link.label}</span>
                  {isActive && <div className="owner-nav-underline" />}
                </Link>
              );
            })}
          </div>

          <div className="owner-nav-right">
            {/* Notification Bell */}
            <div className="owner-notif-wrap" ref={notifRef}>
              <button className="owner-nav-icon-btn" title="Notifications" onClick={() => setShowNotifs(!showNotifs)}>
                <Bell size={19} />
                {unreadCount > 0 && <span className="owner-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {showNotifs && (
                <div className="owner-notif-dropdown">
                  <div className="notif-dd-header">
                    <span className="notif-dd-title">Notifications</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {unreadCount > 0 && <button className="notif-mark-all" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</button>}
                      {notifications.length > 0 && <button className="notif-mark-all" style={{ color: '#ef4444' }} onClick={clearAll}><Trash2 size={14} /> Clear</button>}
                    </div>
                  </div>
                  <div className="notif-dd-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty"><Bell size={24} /><p>No notifications</p></div>
                    ) : (
                      notifications.slice(0, 20).map((n) => {
                        const Icon = typeIcons[n.type] || Info;
                        const color = typeColors[n.type] || '#6B7280';
                        return (
                          <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`} onClick={() => !n.is_read && markRead(n.id)}>
                            <div className="notif-icon" style={{ background: `${color}18`, color }}><Icon size={16} /></div>
                            <div className="notif-content">
                              <span className="notif-item-title">{n.title}</span>
                              <span className="notif-item-msg">{n.message}</span>
                              <span className="notif-item-meta">{n.sender_name} · {relTime(n.created_at)}</span>
                            </div>
                            {!n.is_read && <span className="notif-unread-dot" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="owner-nav-divider" />

            {/* User Dropdown */}
            <div className="owner-nav-user-wrap" ref={menuRef}>
              <button className="owner-nav-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="owner-nav-avatar"><span>{avatarInitial}</span></div>
                <div className="owner-nav-user-info">
                  <span className="owner-nav-user-name">{displayName}</span>
                  <span className="owner-nav-user-role">Owner</span>
                </div>
                <ChevronDown size={14} className={`owner-chevron ${showUserMenu ? 'open' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="owner-nav-dropdown">
                  <div className="owner-dropdown-header">
                    <div className="owner-dropdown-avatar">{avatarInitial}</div>
                    <div>
                      <div className="owner-dropdown-name">{displayName}</div>
                      <div className="owner-dropdown-email">{displayEmail}</div>
                    </div>
                  </div>
                  <div className="owner-dropdown-divider" />
                  <Link to="/owner/dashboard" className="owner-dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                  <Link to="/owner/analytics" className="owner-dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <BarChart3 size={15} /> Analytics
                  </Link>
                  <div className="owner-dropdown-divider" />
                  <button className="owner-dropdown-item logout" onClick={handleLogout}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hamburger — after nav-right so bell sits to its left */}
          <button className="owner-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Drawer ── */}
      {mobileOpen && (
        <div className="owner-mobile-drawer" onClick={() => setMobileOpen(false)}>
          <nav className="owner-mobile-nav" onClick={e => e.stopPropagation()}>
            {ownerLinks.map((link) => {
              const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`owner-mobile-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="owner-mobile-divider" />
            <button className="owner-mobile-link owner-mobile-logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      )}

      <style>{`
        .owner-topbar { background: #1a242f; border-bottom: 1px solid rgba(255,255,255,0.06); width: 100%; overflow: hidden; box-sizing: border-box; }
        .owner-topbar-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 2rem; font-size: 0.7rem; color: rgba(255,255,255,0.5); width: 100%; box-sizing: border-box; overflow: hidden; }
        .owner-topbar-left { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; }
        .owner-topbar-right { display: flex; align-items: center; gap: 1rem; }
        .owner-store-status { display: flex; align-items: center; gap: 0.35rem; font-weight: 600; color: #4ade80; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.5); animation: pulse-dot 2s infinite; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .owner-navbar { background: #232F3E; border-bottom: 3px solid #F97316; position: sticky; top: 0; z-index: 100; width: 100%; max-width: 100%; box-shadow: 0 2px 12px rgba(0,0,0,0.15); box-sizing: border-box; }
        .owner-navbar-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; padding: 0 2rem; height: 58px; gap: 1.5rem; width: 100%; box-sizing: border-box; min-width: 0; }

        .owner-nav-logo { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; flex-shrink: 0; }
        .owner-nav-logo-img { height: 32px; width: auto; object-fit: contain; display: block; flex-shrink: 0; }
        .owner-nav-logo-text { display: flex; flex-direction: column; line-height: 1.15; }
        .owner-nav-logo-name { font-size: 1.05rem; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
        .owner-nav-accent { color: #F97316; }
        .owner-nav-logo-tag { font-size: 0.6rem; font-weight: 400; color: rgba(255,255,255,0.45); letter-spacing: 0.06em; text-transform: uppercase; }
        .owner-nav-accent { color: #F97316; }
        .owner-nav-logo-tag { font-size: 0.58rem; font-weight: 700; color: rgba(249,115,22,0.8); letter-spacing: 0.1em; text-transform: uppercase; }

        .owner-nav-links { display: flex; align-items: center; gap: 0.15rem; flex: 1; margin-left: 1rem; }
        .owner-nav-link { position: relative; display: flex; align-items: center; gap: 0.45rem; padding: 0.55rem 1.1rem; border-radius: 8px; color: rgba(255,255,255,0.65); text-decoration: none; font-size: 0.84rem; font-weight: 500; transition: all 0.2s ease; white-space: nowrap; }
        .owner-nav-link:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.95); }
        .owner-nav-link.active { background: rgba(249,115,22,0.12); color: #F97316; font-weight: 600; }
        .owner-nav-underline { position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); width: 60%; height: 3px; background: #F97316; border-radius: 3px 3px 0 0; }

        .owner-nav-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; min-width: 0; }
        .owner-nav-icon-btn { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: transparent; color: rgba(255,255,255,0.65); border: none; cursor: pointer; transition: all 0.15s; }
        .owner-nav-icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .owner-notif-badge { position: absolute; top: 4px; right: 3px; min-width: 16px; height: 16px; border-radius: 8px; background: #ef4444; color: #fff; font-size: 0.6rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 1.5px solid #232F3E; padding: 0 3px; animation: badge-pulse 2s infinite; }
        @keyframes badge-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }

        .owner-notif-wrap { position: relative; }

        /* Notification Dropdown */
        .owner-notif-dropdown { position: absolute; top: calc(100% + 8px); right: -60px; width: 380px; background: #fff; border-radius: 14px; box-shadow: 0 12px 40px rgba(0,0,0,0.18); z-index: 200; animation: dropIn 0.2s ease; overflow: hidden; }
        .notif-dd-header { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border-bottom: 1px solid #f3f4f6; }
        .notif-dd-title { font-size: 0.92rem; font-weight: 700; color: #1e293b; }
        .notif-mark-all { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 600; color: #F97316; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .notif-mark-all:hover { background: #FFF7ED; }
        .notif-dd-list { max-height: 400px; overflow-y: auto; }
        .notif-empty { display: flex; flex-direction: column; align-items: center; padding: 2rem; color: #9ca3af; gap: 8px; }
        .notif-empty p { font-size: 0.82rem; margin: 0; }
        .notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 0.75rem 1rem; border-bottom: 1px solid #f9fafb; cursor: pointer; transition: background 0.12s; position: relative; }
        .notif-item:hover { background: #f9fafb; }
        .notif-item.unread { background: #FEF2F2; border-left: 3px solid #ef4444; }
        .notif-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .notif-content { flex: 1; min-width: 0; }
        .notif-item-title { display: block; font-size: 0.8rem; font-weight: 600; color: #1e293b; line-height: 1.3; }
        .notif-item-msg { display: block; font-size: 0.72rem; color: #6b7280; margin-top: 2px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .notif-item-meta { display: block; font-size: 0.65rem; color: #9ca3af; margin-top: 3px; }
        .notif-unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; flex-shrink: 0; margin-top: 6px; animation: pulse-notif 2s infinite; }
        @keyframes pulse-notif { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(239,68,68,0); } }

        .owner-nav-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.1); margin: 0 0.3rem; }

        .owner-nav-user-wrap { position: relative; }
        .owner-nav-user-btn { display: flex; align-items: center; gap: 0.55rem; padding: 0.3rem 0.6rem 0.3rem 0.3rem; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .owner-nav-user-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); }
        .owner-nav-avatar { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #F97316, #f59e0b); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 0.8rem; box-shadow: 0 2px 6px rgba(249,115,22,0.25); }
        .owner-nav-user-info { display: flex; flex-direction: column; text-align: left; line-height: 1.2; }
        .owner-nav-user-name { font-size: 0.8rem; font-weight: 600; color: #fff; }
        .owner-nav-user-role { font-size: 0.65rem; color: rgba(255,255,255,0.45); font-weight: 500; }
        .owner-chevron { color: rgba(255,255,255,0.4); transition: transform 0.2s; }
        .owner-chevron.open { transform: rotate(180deg); }

        .owner-nav-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 220px; background: #fff; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05); padding: 0.4rem; animation: dropIn 0.2s ease; z-index: 200; }
        @keyframes dropIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .owner-dropdown-header { display: flex; align-items: center; gap: 0.65rem; padding: 0.7rem 0.75rem; }
        .owner-dropdown-avatar { width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #F97316, #f59e0b); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
        .owner-dropdown-name { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
        .owner-dropdown-email { font-size: 0.72rem; color: #94a3b8; }
        .owner-dropdown-divider { height: 1px; background: #f1f5f9; margin: 0.25rem 0.5rem; }
        .owner-dropdown-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.75rem; border-radius: 8px; font-size: 0.82rem; font-weight: 500; color: #475569; text-decoration: none; cursor: pointer; border: none; background: none; width: 100%; font-family: inherit; transition: background 0.12s; }
        .owner-dropdown-item:hover { background: #f8fafc; color: #1e293b; }
        .owner-dropdown-item.logout { color: #ef4444; }
        .owner-dropdown-item.logout:hover { background: #fef2f2; color: #dc2626; }

        /* Hamburger button — hidden on desktop */
        .owner-hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          flex-shrink: 0;
        }
        .owner-hamburger:hover { background: rgba(255,255,255,0.14); color: #fff; }

        /* Mobile drawer */
        .owner-mobile-drawer {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
          background: rgba(0,0,0,0.5);
        }
        .owner-mobile-nav {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: #232F3E;
          padding: 1rem 0 0.5rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
        }
        .owner-mobile-link {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 1.5rem;
          color: rgba(255,255,255,0.75);
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 500;
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s, color 0.15s;
          text-align: left;
        }
        .owner-mobile-link:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .owner-mobile-link.active { background: rgba(249,115,22,0.15); color: #F97316; font-weight: 600; }
        .owner-mobile-logout { color: #f87171; }
        .owner-mobile-logout:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
        .owner-mobile-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 0.4rem 0; }

        @media (max-width: 768px) {
          .owner-topbar-inner { padding: 0.3rem 1rem; }
          .owner-nav-logo-img { height: 26px !important; }
          .owner-nav-logo-name { font-size: 0.92rem !important; }
          .owner-nav-logo-tag { display: block; font-size: 0.52rem; }
          .owner-topbar-left span { display: none; }
          /* Keep notification dropdown in-viewport on tablets */
          .owner-notif-dropdown { right: 0; width: min(340px, calc(100vw - 16px)); }
        }

        /* iPad + tablet + mobile: collapse nav links into drawer */
        @media (max-width: 1024px) {
          .owner-hamburger { display: flex; }
          .owner-nav-links { display: none; }
          .owner-nav-right { margin-left: auto; }
          .owner-navbar-inner { padding: 0 1rem; gap: 0.75rem; }
          .owner-nav-logo {
            flex: 0 0 auto !important;
            width: auto !important;
            max-width: fit-content;
          }
        }

        /* Mobile only: hide user button, keep bell + hamburger */
        @media (max-width: 640px) {
          .owner-nav-user-wrap { display: none; }
          .owner-nav-divider { display: none; }
          .owner-topbar-right { display: none; }
          .owner-navbar-inner { padding: 0 0.75rem; gap: 0.5rem; }
          .owner-nav-logo { flex: 0 0 auto !important; min-width: 0; max-width: fit-content; }
          .owner-nav-logo-img { height: 28px !important; flex-shrink: 0; }
          .owner-notif-dropdown { position: fixed; top: 100px; left: 8px; right: 8px; width: auto; max-width: none; }
        }
      `}</style>
    </>
  );
}
