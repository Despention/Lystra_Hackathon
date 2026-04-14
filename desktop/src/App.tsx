import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  IoAddCircleOutline, IoAddCircle,
  IoTimeOutline, IoTime,
  IoSettingsOutline,
  IoClose,
  IoSunny,
  IoMoon,
} from 'react-icons/io5'
import React from 'react'
import BackgroundCanvas from './components/BackgroundCanvas'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import AnalysisPage from './pages/AnalysisPage'
import ResultPage from './pages/ResultPage'
import IssueDetailPage from './pages/IssueDetailPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import { useSettingsStore } from './store/settingsStore'
import { useTranslation } from './contexts/ThemeContext'

const App: React.FC = () => {
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const t = useTranslation()
  const storeTheme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const lang = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)

  const isLight = storeTheme === 'light'

  function toggleTheme() {
    setTheme(isLight ? 'dark' : 'light')
  }

  function toggleLang() {
    setLanguage(lang === 'ru' ? 'en' : 'ru')
  }

  const navItems = [
    { path: '/upload',  label: t('analyzeDoc'),  iconOutline: <IoAddCircleOutline size={16} />, iconFilled: <IoAddCircle size={16} /> },
    { path: '/history', label: t('history'),      iconOutline: <IoTimeOutline size={16} />,      iconFilled: <IoTime size={16} /> },
  ]

  return (
    <>
    <BackgroundCanvas />
    <div className="app-layout">
      {/* Navbar */}
      <nav className="navbar">
        {/* Logo */}
        <NavLink to="/" className="navbar-logo">
          <div className="navbar-logo-icon">B</div>
          <span className="navbar-logo-text">BananassDev</span>
        </NavLink>

        {/* Nav links */}
        <div className="navbar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`navbar-item ${isActive ? 'navbar-item--active' : ''}`}
              >
                {item.label}
              </NavLink>
            )
          })}
        </div>

        <div className="navbar-spacer" />

        {/* Theme toggle */}
        <button
          className="navbar-icon-btn"
          onClick={toggleTheme}
          title={isLight ? t('themeDark') : t('themeLight')}
        >
          {isLight ? <IoMoon size={17} /> : <IoSunny size={17} />}
        </button>

        {/* Language toggle */}
        <button className="navbar-lang-btn" onClick={toggleLang} title={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}>
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

        {/* Settings */}
        <button
          className="navbar-settings-btn"
          onClick={() => setSettingsOpen(true)}
          title={t('settings')}
        >
          <IoSettingsOutline size={19} />
        </button>
      </nav>

      {/* Main content */}
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<HomePage />} />
          <Route path="/upload"       element={<UploadPage />} />
          <Route path="/analysis/:id" element={<AnalysisPage />} />
          <Route path="/result/:id"   element={<ResultPage />} />
          <Route path="/issue-detail" element={<IssueDetailPage />} />
          <Route path="/history"      element={<HistoryPage />} />
          <Route path="/settings"     element={<SettingsPage />} />
        </Routes>
      </main>

      {/* Settings Drawer */}
      {settingsOpen && (
        <>
          <div className="settings-overlay" onClick={() => setSettingsOpen(false)} />
          <div className="settings-drawer">
            <div className="settings-drawer__header">
              <span className="settings-drawer__title">{t('settings')}</span>
              <button className="settings-drawer__close" onClick={() => setSettingsOpen(false)}>
                <IoClose size={20} />
              </button>
            </div>
            <div className="settings-drawer__body">
              <SettingsPage />
            </div>
          </div>
        </>
      )}
    </div>
    </>
  )
}

export default App
