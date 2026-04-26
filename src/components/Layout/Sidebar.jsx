import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import TofuAvatar from '../UI/TofuAvatar';
import './Sidebar.css';

export default function Sidebar({ collapsed, onToggle }) {
  const { user, isAdmin, isSenior } = useAuth();
  const location = useLocation();

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.path === '/allocation') return isAdmin;
    if (item.path === '/groups') return isAdmin;
    return true;
  });

  return (
    <motion.aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="sidebar__header">
        <motion.div
          className="sidebar__logo"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <span className="sidebar__logo-icon">🧾</span>
          {!collapsed && <span className="sidebar__logo-text">案件管理系統</span>}
        </motion.div>
        <button className="sidebar__toggle" onClick={onToggle}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="sidebar__nav">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <motion.div
              className="sidebar__link-inner"
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <span className="sidebar__link-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
            </motion.div>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <TofuAvatar seed={user?.employeeName || 'user'} size={36} />
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.employeeName}</span>
              <span className="sidebar__user-role">
                {isAdmin ? '管理員' : (isSenior ? '資深使用者' : '使用者')}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
