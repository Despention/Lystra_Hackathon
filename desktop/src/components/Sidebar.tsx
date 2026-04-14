
import { useNavigate, useLocation } from 'react-router-dom';
import { IoHome, IoAdd, IoTime, IoSettings } from 'react-icons/io5';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: <IoHome /> },
  { path: '/upload', label: 'New Analysis', icon: <IoAdd /> },
  { path: '/history', label: 'History', icon: <IoTime /> },
  { path: '/settings', label: 'Settings', icon: <IoSettings /> },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-box">TZ</div>
        <span className="sidebar__logo-text">TZ Analyzer</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar__version">v0.1.0 MVP</div>
    </aside>
  );
}
