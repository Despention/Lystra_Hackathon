import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  IoHomeOutline,
  IoHome,
  IoAddCircleOutline,
  IoAddCircle,
  IoTimeOutline,
  IoTime,
  IoSettingsOutline,
  IoSettings,
} from 'react-icons/io5'
import React from 'react'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import AnalysisPage from './pages/AnalysisPage'
import ResultPage from './pages/ResultPage'
import IssueDetailPage from './pages/IssueDetailPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

interface SidebarItem {
  path: string
  label: string
  iconOutline: React.ReactNode
  iconFilled: React.ReactNode
}

const sidebarItems: SidebarItem[] = [
  {
    path: '/',
    label: 'Home',
    iconOutline: <IoHomeOutline size={22} />,
    iconFilled: <IoHome size={22} />,
  },
  {
    path: '/upload',
    label: 'New Analysis',
    iconOutline: <IoAddCircleOutline size={22} />,
    iconFilled: <IoAddCircle size={22} />,
  },
  {
    path: '/history',
    label: 'History',
    iconOutline: <IoTimeOutline size={22} />,
    iconFilled: <IoTime size={22} />,
  },
  {
    path: '/settings',
    label: 'Settings',
    iconOutline: <IoSettingsOutline size={22} />,
    iconFilled: <IoSettings size={22} />,
  },
]

const App: React.FC = () => {
  const location = useLocation()

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">TZ</div>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
              >
                <span className="sidebar-item-icon">
                  {isActive ? item.iconFilled : item.iconOutline}
                </span>
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-version">v0.1.0</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis/:id" element={<AnalysisPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/issue-detail" element={<IssueDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
