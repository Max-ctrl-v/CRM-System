import { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../services/api';

export default function TwoFactorSetup({ totpEnabled, onStatusChange }) {
  const [qrData, setQrData] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  const startSetup = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/totp/setup');
      setQrData(data.qrDataUrl);
      setError('');
    } catch {
      setError('Fehler beim Einrichten.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await api.post('/totp/verify', { code });
      setQrData(null);
      setCode('');
      onStatusChange?.(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Ungültiger Code.');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (!disablePassword) {
      setError('Passwort erforderlich.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/totp/disable', { password: disablePassword });
      setShowDisableConfirm(false);
      setDisablePassword('');
      onStatusChange?.(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Deaktivieren.');
    } finally {
      setLoading(false);
    }
  };

  if (totpEnabled) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30">
          <ShieldCheck className="w-6 h-6 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-display font-semibold text-text-primary dark:text-dark-text-primary">
              2FA ist aktiviert
            </p>
            <p className="text-xs font-body text-text-secondary dark:text-dark-text-secondary">
              Dein Konto ist durch Zwei-Faktor-Authentifizierung geschützt.
            </p>
          </div>
          <button
            onClick={() => { setShowDisableConfirm(true); setError(''); setDisablePassword(''); }}
            disabled={loading}
            className="text-xs font-body font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg
              hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            Deaktivieren
          </button>
        </div>
        {showDisableConfirm && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/30 space-y-3">
            <p className="text-sm font-body text-red-700 dark:text-red-300">
              Bitte bestätige mit deinem Passwort:
            </p>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => { setDisablePassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && disable()}
              placeholder="Passwort eingeben"
              className="w-full bg-white dark:bg-dark-raised border border-red-200 dark:border-red-800/30 rounded-lg px-3 py-2 text-sm
                text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-red-300 focus:border-red-300"
            />
            {error && <p className="text-xs text-red-500 font-body">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={disable}
                disabled={loading || !disablePassword}
                className="text-xs font-body font-medium text-white bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg
                  transition-colors disabled:opacity-50"
              >
                2FA deaktivieren
              </button>
              <button
                onClick={() => { setShowDisableConfirm(false); setError(''); }}
                className="text-xs font-body font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg
                  hover:bg-gray-100 dark:hover:bg-dark-raised transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30">
        <ShieldOff className="w-6 h-6 text-amber-500" />
        <div className="flex-1">
          <p className="text-sm font-display font-semibold text-text-primary dark:text-dark-text-primary">
            2FA ist deaktiviert
          </p>
          <p className="text-xs font-body text-text-secondary dark:text-dark-text-secondary">
            Aktiviere 2FA für mehr Sicherheit.
          </p>
        </div>
        <button
          onClick={startSetup}
          disabled={loading}
          className="btn-primary text-xs py-1.5 px-3"
        >
          Einrichten
        </button>
      </div>

      {qrData && (
        <div className="p-6 bg-surface-elevated dark:bg-dark-elevated rounded-xl text-center space-y-4">
          <p className="text-sm font-body text-text-secondary dark:text-dark-text-secondary">
            Scanne den QR-Code mit deiner Authenticator-App:
          </p>
          <img src={qrData} alt="2FA QR Code" className="mx-auto w-48 h-48 rounded-lg" />
          <div className="max-w-xs mx-auto">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              placeholder="6-stelliger Code"
              className="w-full text-center text-lg font-mono tracking-[0.3em] bg-surface-raised dark:bg-dark-raised border border-border dark:border-dark-border rounded-lg px-4 py-2.5
                text-text-primary dark:text-dark-text-primary focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-body">{error}</p>}
          <button
            onClick={verify}
            disabled={code.length !== 6 || loading}
            className="btn-primary py-2 px-6 text-sm disabled:opacity-50"
          >
            Bestätigen
          </button>
        </div>
      )}
    </div>
  );
}
