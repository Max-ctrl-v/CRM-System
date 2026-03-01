import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Mail } from 'lucide-react';
import TwoFactorSetup from '../components/TwoFactorSetup';

export default function SettingsPage() {
  const { user } = useAuth();
  const [totpEnabled, setTotpEnabled] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-text-primary dark:text-dark-text-primary tracking-display">
        Einstellungen
      </h1>

      {/* Profile */}
      <section className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-display font-semibold text-text-primary dark:text-dark-text-primary">
            Profil
          </h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-20 text-xs font-body font-medium text-text-secondary dark:text-dark-text-secondary">Name</span>
            <span className="text-sm font-body text-text-primary dark:text-dark-text-primary">{user?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-xs font-body font-medium text-text-secondary dark:text-dark-text-secondary">E-Mail</span>
            <span className="text-sm font-body text-text-primary dark:text-dark-text-primary">{user?.email}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-xs font-body font-medium text-text-secondary dark:text-dark-text-secondary">Rolle</span>
            <span className="text-[10px] font-body font-semibold uppercase bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded">
              {user?.role}
            </span>
          </div>
        </div>
      </section>

      {/* 2FA */}
      <section className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-display font-semibold text-text-primary dark:text-dark-text-primary">
            Sicherheit
          </h2>
        </div>
        <TwoFactorSetup
          totpEnabled={totpEnabled}
          onStatusChange={setTotpEnabled}
        />
      </section>

      {/* Email Digest */}
      <section className="bg-surface-raised dark:bg-dark-raised rounded-2xl p-6"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-brand-500" />
          <h2 className="text-base font-display font-semibold text-text-primary dark:text-dark-text-primary">
            E-Mail Benachrichtigungen
          </h2>
        </div>
        <p className="text-sm font-body text-text-secondary dark:text-dark-text-secondary">
          Du erhältst jeden Montag eine Wochenübersicht per E-Mail an <strong>{user?.email}</strong>.
        </p>
        <p className="text-xs font-body text-text-tertiary dark:text-dark-text-tertiary mt-2">
          Die Konfiguration erfolgt durch den Administrator.
        </p>
      </section>
    </div>
  );
}
