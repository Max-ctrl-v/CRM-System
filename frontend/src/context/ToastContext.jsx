import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: { bg: '#ecfdf5', bgDark: 'rgba(16,185,129,0.15)', border: '#a7f3d0', borderDark: 'rgba(16,185,129,0.3)', color: '#065f46', colorDark: '#6ee7b7', icon: '#10b981' },
  error: { bg: '#fef2f2', bgDark: 'rgba(239,68,68,0.15)', border: '#fecaca', borderDark: 'rgba(239,68,68,0.3)', color: '#991b1b', colorDark: '#fca5a5', icon: '#ef4444' },
  info: { bg: '#eff6ff', bgDark: 'rgba(59,130,246,0.15)', border: '#bfdbfe', borderDark: 'rgba(59,130,246,0.3)', color: '#1e40af', colorDark: '#93c5fd', icon: '#3b82f6' },
};

function ToastItem({ toast, onClose }) {
  const Icon = ICONS[toast.type] || Info;
  const style = STYLES[toast.type] || STYLES.info;
  const { dark } = useTheme();

  return (
    <div
      className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl font-body text-sm toast-enter"
      style={{
        background: dark ? style.bgDark : style.bg,
        border: `1px solid ${dark ? style.borderDark : style.border}`,
        color: dark ? style.colorDark : style.color,
        boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      <Icon className="w-4.5 h-4.5 mt-0.5 shrink-0" style={{ color: style.icon, width: 18, height: 18 }} />
      <span className="flex-1 font-medium leading-snug">{toast.message}</span>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 mt-0.5"
        style={{ transition: 'background-color 150ms ease' }}
      >
        <X className="w-3.5 h-3.5" style={{ color: style.color }} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2.5 pointer-events-none">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
