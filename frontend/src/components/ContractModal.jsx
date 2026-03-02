import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  FileText,
  X,
  MapPin,
  Clock,
  Percent,
  Download,
  Loader2,
  Building2,
  CheckCircle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ContractModal({ company, onClose, onComplete }) {
  const { dark } = useTheme();
  const [form, setForm] = useState({
    durationMonths: 12,
    commissionRate: '',
    street: '',
    streetNumber: '',
    zipCode: '',
    city: company?.city || '',
    country: 'Deutschland',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/contracts', {
        companyId: company.id,
        durationMonths: parseInt(form.durationMonths),
        commissionRate: parseFloat(form.commissionRate),
        street: form.street,
        streetNumber: form.streetNumber,
        zipCode: form.zipCode,
        city: form.city,
        country: form.country,
      });
      setSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Vertrags.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!success) return;
    window.open(`${API_URL}/api/contracts/${success.id}/download`, '_blank');
  }

  function handleDone() {
    onComplete();
  }

  const brandColor = '#0D7377';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        style={{
          background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        className="fixed z-50 rounded-2xl w-[520px] max-h-[90vh] overflow-y-auto"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: dark ? '#1a1d27' : '#ffffff',
          border: `1px solid ${dark ? '#2a2d3d' : '#e5e7eb'}`,
          boxShadow: dark
            ? '0 8px 32px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset'
            : '0 8px 32px rgba(0,0,0,0.14), 0 24px 64px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.8) inset',
        }}
      >
        {/* Header accent bar */}
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${brandColor}, #10b981)` }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${brandColor}, #10b981)`,
                  boxShadow: `0 2px 8px ${brandColor}50`,
                }}
              >
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-gray-900 tracking-display">
                  Vertrag erstellen
                </h3>
                <p className="text-[12px] text-gray-500 font-body">
                  Automatischer Dienstleistungsvertrag
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300 active:scale-95"
              style={{ transition: 'transform 150ms cubic-bezier(0.16,1,0.3,1), color 150ms ease, background 150ms ease' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Company info */}
          <div
            className="rounded-lg px-3.5 py-2.5 mb-5 flex items-center gap-2"
            style={{
              background: dark ? '#252838' : '#f8f9fc',
              border: `1px solid ${dark ? '#2a2d3d' : '#eef0f4'}`,
            }}
          >
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-[13px] font-display font-semibold text-gray-800 truncate">
              {company?.name}
            </span>
          </div>

          {success ? (
            /* ── Success state ── */
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: `linear-gradient(135deg, #10b981, #34d399)`,
                  boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
                }}
              >
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-sm font-display font-bold text-gray-900 mb-1">
                Vertrag erstellt!
              </h4>
              <p className="text-[12px] text-gray-500 font-body mb-1">
                Vertragsnummer: <span className="font-semibold text-gray-700">{success.contractNumber}</span>
              </p>
              <p className="text-[11px] text-gray-400 font-body mb-5">
                Das PDF wurde automatisch generiert.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={handleDownload}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF herunterladen
                </button>
                <button onClick={handleDone} className="btn-secondary flex-1">
                  Weiter
                </button>
              </div>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  className="rounded-lg px-3.5 py-2.5 mb-4 text-[12px] font-body font-medium text-red-700"
                  style={{
                    background: dark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
                    border: `1px solid ${dark ? 'rgba(239,68,68,0.25)' : '#fecaca'}`,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Duration + Commission row */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                    Laufzeit (Monate)
                  </label>
                  <input
                    type="number"
                    name="durationMonths"
                    value={form.durationMonths}
                    onChange={handleChange}
                    min="1"
                    max="120"
                    required
                    className="input-field w-full"
                    placeholder="z.B. 12"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    <Percent className="w-3 h-3 inline mr-1 -mt-0.5" />
                    % Förderkosten
                  </label>
                  <input
                    type="number"
                    name="commissionRate"
                    value={form.commissionRate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    className="input-field w-full"
                    placeholder="z.B. 15"
                  />
                </div>
              </div>

              {/* Address section heading */}
              <div className="flex items-center gap-2 mt-5 mb-3">
                <MapPin className="w-3.5 h-3.5" style={{ color: brandColor }} />
                <span className="text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider">
                  Adresse des Auftraggebers
                </span>
                <div className="flex-1 h-px" style={{ background: dark ? '#2a2d3d' : '#e5e7eb' }} />
              </div>

              {/* Street + Number row */}
              <div className="grid grid-cols-[1fr,100px] gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Straße
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={form.street}
                    onChange={handleChange}
                    required
                    className="input-field w-full"
                    placeholder="Musterstraße"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Nr.
                  </label>
                  <input
                    type="text"
                    name="streetNumber"
                    value={form.streetNumber}
                    onChange={handleChange}
                    required
                    className="input-field w-full"
                    placeholder="12a"
                  />
                </div>
              </div>

              {/* ZIP + City row */}
              <div className="grid grid-cols-[120px,1fr] gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    PLZ
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={form.zipCode}
                    onChange={handleChange}
                    required
                    className="input-field w-full"
                    placeholder="10115"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Stadt
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    className="input-field w-full"
                    placeholder="Berlin"
                  />
                </div>
              </div>

              {/* Country */}
              <div className="mb-5">
                <label className="block text-[11px] font-body font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Land
                </label>
                <input
                  type="text"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className="input-field w-full"
                  placeholder="Deutschland"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Wird erstellt…
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Vertrag erstellen
                    </>
                  )}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Überspringen
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
