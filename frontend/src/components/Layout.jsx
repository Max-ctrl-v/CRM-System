import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, LogOut, List, KanbanSquare, CheckSquare, Search, Moon, Sun, Settings, MessageCircle, Download, BarChart3 } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import KeyboardShortcuts from './KeyboardShortcuts';
import CommandPalette from './CommandPalette';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { path: '/companies', label: 'Alle Firmen', icon: List },
  { path: '/aufgaben', label: 'Aufgaben', icon: CheckSquare },
  { path: '/chat', label: 'Chat', icon: MessageCircle },
  { path: '/downloads', label: 'Downloads', icon: Download },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { dark, toggleDark } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-surface-base">
      {/* Top Navigation */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'linear-gradient(135deg, #032425 0%, #063a3c 30%, #094e51 60%, #0b6265 100%)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        <div className="max-w-[1600px] mx-auto px-6 flex items-center h-[56px]">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 mr-10 shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #36c0c5 0%, #0D7377 50%, #094e51 100%)',
                boxShadow: '0 2px 8px rgba(13,115,119,0.5), 0 4px 16px rgba(13,115,119,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <LayoutDashboard className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-[15px] font-display font-bold text-white tracking-display">
              CRM Pipeline
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold font-body
                    focus-visible:ring-2 focus-visible:ring-brand-300
                    ${isActive
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/85'
                    }`}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))'
                      : 'transparent',
                    boxShadow: isActive
                      ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.15)'
                      : 'none',
                    transition: 'background-color 150ms ease, color 150ms ease',
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Search trigger */}
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/8 mr-3
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            style={{ transition: 'background-color 150ms ease, color 150ms ease' }}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[12px] font-body">Suche</span>
            <kbd className="text-[9px] font-mono font-semibold bg-white/10 px-1.5 py-0.5 rounded border border-white/15">
              Ctrl+K
            </kbd>
          </button>

          {/* User Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-display font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, #36c0c5, #0D7377)',
                  boxShadow: '0 2px 6px rgba(13,115,119,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-display font-semibold text-white leading-tight">{user?.name}</span>
                <span className="text-[10px] text-white/35 font-body leading-tight">{user?.role}</span>
              </div>
            </div>

            <NotificationPanel />

            <div className="w-px h-6 bg-white/10 mx-1" />

            <Link
              to="/settings"
              className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/10
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
                active:scale-95"
              title="Einstellungen"
              style={{ transition: 'background-color 150ms ease, color 150ms ease, transform 100ms ease' }}
            >
              <Settings className="w-4 h-4" />
            </Link>

            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/10
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
                active:scale-95"
              title={dark ? 'Light Mode' : 'Dark Mode'}
              style={{ transition: 'background-color 150ms ease, color 150ms ease, transform 100ms ease' }}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-white/35 hover:text-white hover:bg-white/10
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300
                active:scale-95"
              title="Abmelden"
              style={{ transition: 'background-color 150ms ease, color 150ms ease, transform 100ms ease' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
}
