import { useState, useRef, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function TwoFactorInput({ onSubmit, loading, error }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (i, value) => {
    const v = value.replace(/\D/g, '');
    if (!v && value !== '') return;

    const newDigits = [...digits];
    newDigits[i] = v.slice(-1);
    setDigits(newDigits);

    if (v && i < 5) {
      refs.current[i + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (newDigits.every((d) => d) && newDigits.join('').length === 6) {
      onSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      refs.current[5]?.focus();
      onSubmit(text);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-brand-500" />
      </div>

      <div>
        <h3 className="text-lg font-display font-bold text-text-primary dark:text-dark-text-primary">
          Zwei-Faktor-Authentifizierung
        </h3>
        <p className="text-sm font-body text-text-secondary dark:text-dark-text-secondary mt-1">
          Gib den 6-stelligen Code aus deiner Authenticator-App ein.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-14 text-center text-xl font-mono font-bold
              bg-surface-elevated dark:bg-dark-elevated border-2 border-border dark:border-dark-border rounded-xl
              text-text-primary dark:text-dark-text-primary
              focus:ring-2 focus:ring-brand-300 focus:border-brand-300 outline-none
              transition-all"
            disabled={loading}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 font-body">{error}</p>
      )}
    </div>
  );
}
