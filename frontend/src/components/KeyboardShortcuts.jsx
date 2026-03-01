import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ShortcutHelpModal from './ShortcutHelpModal';

export default function KeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [gMode, setGMode] = useState(false);

  const handleKeyDown = useCallback((e) => {
    // Ignore when typing in inputs/textareas
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

    // Escape — close any modal
    if (e.key === 'Escape') {
      setShowHelp(false);
      setGMode(false);
      return;
    }

    // ? — toggle shortcuts help
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setShowHelp((prev) => !prev);
      return;
    }

    // / — focus search (Ctrl+K trigger)
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      return;
    }

    // G prefix — navigation
    if (gMode) {
      setGMode(false);
      switch (e.key.toLowerCase()) {
        case 'd': navigate('/'); break;
        case 'p': navigate('/pipeline'); break;
        case 'c': navigate('/companies'); break;
        case 'a': navigate('/aufgaben'); break;
        default: break;
      }
      return;
    }

    if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
      setGMode(true);
      setTimeout(() => setGMode(false), 1500);
      return;
    }

    // N — new company (dispatches custom event)
    if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
      if (location.pathname === '/pipeline' || location.pathname === '/companies') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('shortcut:new-company'));
      }
      return;
    }
  }, [navigate, location.pathname, gMode]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return showHelp ? <ShortcutHelpModal onClose={() => setShowHelp(false)} /> : null;
}
