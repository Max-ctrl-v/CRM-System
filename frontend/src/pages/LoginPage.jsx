import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, LayoutDashboard, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left — brand panel */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative"
        style={{
          background: 'linear-gradient(160deg, #021516 0%, #042627 20%, #094e51 50%, #0D7377 75%, #24b8be 100%)',
        }}
      >
        {/* Decorative glows */}
        <div
          className="absolute w-[600px] h-[600px] -top-[150px] -right-[150px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(36,184,190,0.25) 0%, rgba(36,184,190,0.08) 40%, transparent 65%)' }}
        />
        <div
          className="absolute w-[500px] h-[500px] -bottom-[80px] -left-[120px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 40%, transparent 60%)' }}
        />
        <div
          className="absolute w-[300px] h-[300px] top-[40%] left-[30%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 50%)' }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-display">CRM Pipeline</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-display font-extrabold text-white tracking-tight-display leading-[1.15] mb-5">
            Ihre Forschungszulage<br />Pipeline im Griff.
          </h2>
          <p className="text-white/55 text-base font-body leading-relaxed max-w-md">
            Verwalten Sie Ihre Kunden, verfolgen Sie den Fortschritt und nutzen Sie KI-gestützte Recherche — alles in einem Tool.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2.5 mt-8">
            {['Kanban Pipeline', 'KI-Recherche', 'Kontaktverwaltung', 'Bundesanzeiger'].map((feat) => (
              <span
                key={feat}
                className="px-4 py-2 rounded-full text-[13px] font-medium text-white/80 font-body"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/25 text-xs font-body">
          &copy; {new Date().getFullYear()} CRM Pipeline
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative bg-surface-base">
        {/* Subtle background glow */}
        <div
          className="absolute w-[400px] h-[400px] top-[20%] right-[10%] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(13,115,119,0.05) 0%, transparent 60%)' }}
        />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0D7377, #094e51)', boxShadow: '0 2px 8px rgba(13,115,119,0.3)' }}
            >
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-gray-900 tracking-display">CRM Pipeline</span>
          </div>

          <div
            className="bg-white rounded-2xl p-8 border border-border-light"
            style={{
              boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.05), 0 8px 20px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
            }}
          >
            <h1 className="text-2xl font-display font-bold text-gray-900 tracking-display mb-1.5">
              Willkommen zurück
            </h1>
            <p className="text-gray-500 text-sm font-body mb-7">
              Melden Sie sich an, um fortzufahren
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-body">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 font-body">E-Mail-Adresse</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="name@firma.de"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 font-body">Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Anmeldung...
                  </>
                ) : (
                  <>
                    Anmelden
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
