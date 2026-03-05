import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Users,
  Briefcase,
  FlaskConical,
  FileCheck,
  Receipt,
  Banknote,
  Shield,
  TrendingDown,
  Code,
  Cog,
  Pill,
  Car,
  Stethoscope,
  Zap,
  Plane,
  Sprout,
  HardHat,
  CheckCircle,
  Phone,
} from 'lucide-react';

const C = {
  bg: '#0a1428',
  surface: '#0D1B3E',
  card: '#122244',
  primary: '#1E56B5',
  accent: '#4DAEE5',
  accentLight: '#7ECEF5',
  text: '#E8ECF4',
  textMuted: '#8B9DC3',
  white: '#FFFFFF',
  gradient: 'linear-gradient(135deg, #1E56B5 0%, #1A3462 100%)',
  gradientAccent: 'linear-gradient(135deg, #1E56B5 20%, #4DAEE5 100%)',
  statGradient: 'linear-gradient(135deg, #4DAEE5 0%, #7ECEF5 100%)',
};

const sectionStyle = {
  maxWidth: 900,
  margin: '0 auto',
  padding: '0 32px',
};

function Section({ children, style = {} }) {
  return (
    <div style={{ ...sectionStyle, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 28,
          fontWeight: 800,
          color: C.white,
          letterSpacing: '-0.03em',
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {children}
      </h2>
      {sub && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            color: C.textMuted,
            marginTop: 8,
            lineHeight: 1.7,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 16,
        padding: '28px 20px',
        textAlign: 'center',
        border: '1px solid rgba(77,174,229,0.15)',
        boxShadow: '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
      }}
    >
      <div
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 32,
          fontWeight: 800,
          background: C.statGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.03em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: C.textMuted,
          marginTop: 6,
          lineHeight: 1.7,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function CostCard({ icon: Icon, title, description }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(77,174,229,0.12)',
        boxShadow: '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
        flex: 1,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: C.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(30,86,181,0.4)',
        }}
      >
        <Icon size={20} color={C.white} />
      </div>
      <h4
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: C.white,
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          color: C.textMuted,
          margin: 0,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function ProcessStep({ number, title, description }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: C.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 20,
          fontWeight: 800,
          color: C.white,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(30,86,181,0.5), 0 4px 16px rgba(30,86,181,0.25)',
        }}
      >
        {number}
      </div>
      <div style={{ paddingTop: 4 }}>
        <h4
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: C.white,
            margin: '0 0 4px',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            color: C.textMuted,
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function USPCard({ icon: Icon, title, description }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(77,174,229,0.12)',
        boxShadow: '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
        flex: 1,
        minWidth: 0,
      }}
    >
      <Icon size={24} color={C.accent} style={{ marginBottom: 12 }} />
      <h4
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: C.white,
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: C.textMuted,
          margin: 0,
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </div>
  );
}

const INDUSTRIES = [
  { icon: Code, label: 'Software & IT' },
  { icon: Cog, label: 'Maschinenbau' },
  { icon: Pill, label: 'Pharma' },
  { icon: Car, label: 'Automotive' },
  { icon: Stethoscope, label: 'Medizintechnik' },
  { icon: Zap, label: 'Energie' },
  { icon: Plane, label: 'Luft- & Raumfahrt' },
  { icon: Sprout, label: 'Agrarwirtschaft' },
  { icon: HardHat, label: 'Bauwesen' },
];

export default function FZulGWhitepaper() {
  const navigate = useNavigate();

  useEffect(() => {
    // Load Montserrat and Inter fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const handleDownload = () => {
    window.print();
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { margin: 0; padding: 0; }
          @page { margin: 0; size: A4; }
          .whitepaper-root {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .whitepaper-section { break-inside: avoid; }
          .whitepaper-page-break { break-before: page; }
          /* Hide CRM nav */
          header, nav { display: none !important; }
        }
      `}</style>

      {/* Top bar (hidden in print) */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 56,
          zIndex: 30,
          background: 'rgba(10,20,40,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(77,174,229,0.12)',
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => navigate('/downloads')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            color: C.textMuted,
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: 8,
            transition: 'color 150ms ease, background 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.white; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'none'; }}
          onFocus={(e) => { e.currentTarget.style.outline = `2px solid ${C.accent}`; e.currentTarget.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
        >
          <ArrowLeft size={16} />
          Zuruck zu Downloads
        </button>
        <button
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: C.gradient,
            border: 'none',
            color: C.white,
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px 20px',
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(30,86,181,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            transition: 'transform 100ms ease, box-shadow 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,86,181,0.6), inset 0 1px 0 rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(30,86,181,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          onFocus={(e) => { e.currentTarget.style.outline = `2px solid ${C.accent}`; e.currentTarget.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
        >
          <Download size={15} />
          Als PDF herunterladen
        </button>
      </div>

      {/* Whitepaper content */}
      <div
        className="whitepaper-root"
        style={{
          background: C.bg,
          minHeight: '100vh',
          fontFamily: "'Inter', sans-serif",
          color: C.text,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background radial glows */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 800,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(30,86,181,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 600,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(77,174,229,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* ===== HERO / COVER ===== */}
        <div
          className="whitepaper-section"
          style={{
            background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
            padding: '80px 0 64px',
            position: 'relative',
          }}
        >
          <Section>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: 20,
                background: 'rgba(77,174,229,0.12)',
                border: '1px solid rgba(77,174,229,0.2)',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: C.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 24,
              }}
            >
              Whitepaper
            </div>
            <h1
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 48,
                fontWeight: 800,
                color: C.white,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                margin: '0 0 16px',
              }}
            >
              Forschungszulage
              <br />
              <span
                style={{
                  background: C.gradientAccent,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                (FZulG)
              </span>
            </h1>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 18,
                color: C.textMuted,
                maxWidth: 600,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Ihr vollstandiger Leitfaden zur steuerlichen Forschungsforderung
              in Deutschland -- von den Grundlagen bis zur erfolgreichen Antragstellung.
            </p>
            <div
              style={{
                marginTop: 40,
                height: 2,
                background: 'linear-gradient(90deg, rgba(77,174,229,0.4), transparent)',
                borderRadius: 1,
              }}
            />
          </Section>
        </div>

        {/* ===== KEY STATS ===== */}
        <div className="whitepaper-section" style={{ padding: '48px 0 56px' }}>
          <Section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <StatCard value="15 Mio.+" label="Fordervolumen gesichert" />
              <StatCard value="25+" label="Mandate betreut" />
              <StatCard value="100%" label="Bewilligungsquote" />
              <StatCard value="6 Jahre" label="FZulG-Erfahrung" />
            </div>
          </Section>
        </div>

        {/* ===== WAS IST DIE FORSCHUNGSZULAGE? ===== */}
        <div className="whitepaper-section whitepaper-page-break" style={{ padding: '56px 0' }}>
          <Section>
            <SectionTitle sub="Die Forschungszulage ist eine steuerliche Forderung des Bundes, die seit dem 1. Januar 2020 in Kraft ist.">
              Was ist die Forschungszulage?
            </SectionTitle>
            <div
              style={{
                background: C.surface,
                borderRadius: 20,
                padding: 32,
                border: '1px solid rgba(77,174,229,0.1)',
                boxShadow: '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 16px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03) inset',
              }}
            >
              <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, margin: '0 0 16px' }}>
                Das <strong style={{ color: C.white }}>Forschungszulagengesetz (FZulG)</strong> ermoglicht
                allen in Deutschland steuerpflichtigen Unternehmen, unabhangig von Grosse und Branche,
                eine steuerliche Erstattung ihrer Forschungs- und Entwicklungsausgaben.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, margin: '0 0 16px' }}>
                Unternehmen erhalten <strong style={{ color: C.accent }}>25 % ihrer forderfähigen
                F&E-Personalkosten</strong> als Steuergutschrift zuruck. Fur kleine und mittlere
                Unternehmen (KMU) betragt der Satz sogar <strong style={{ color: C.accent }}>35 %</strong>.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, margin: 0 }}>
                Besonders attraktiv: Die Zulage wird als <strong style={{ color: C.white }}>direkte
                Barauszahlung</strong> gewahrt, wenn keine Steuerschuld besteht. Sie ist ruckwirkend
                fur Steuerjahre ab 2020 beantragbar.
              </p>
            </div>
          </Section>
        </div>

        {/* ===== FORDERFÄHIGE KOSTEN ===== */}
        <div className="whitepaper-section" style={{ padding: '56px 0' }}>
          <Section>
            <SectionTitle sub="Diese Kostenarten konnen im Rahmen der Forschungszulage geltend gemacht werden.">
              Forderfähige Kosten
            </SectionTitle>
            <div style={{ display: 'flex', gap: 16 }}>
              <CostCard
                icon={Users}
                title="Personalkosten"
                description="Lohne und Gehalter fur Mitarbeiter, die direkt an F&E-Projekten arbeiten. Dies ist die primare Bemessungsgrundlage."
              />
              <CostCard
                icon={Briefcase}
                title="Eigenleistungen"
                description="Einkommen aus selbstandiger Tatigkeit im Bereich Forschung und Entwicklung innerhalb des Unternehmens."
              />
              <CostCard
                icon={FlaskConical}
                title="Auftragsforschung"
                description="60 % der Kosten fur externe Auftragsforschung konnen als forderfähige Aufwendungen geltend gemacht werden."
              />
            </div>
          </Section>
        </div>

        {/* ===== FORDERHÖHE ===== */}
        <div className="whitepaper-section whitepaper-page-break" style={{ padding: '56px 0' }}>
          <Section>
            <SectionTitle sub="Maximale jahrliche Forderung je nach Unternehmensgrösse.">
              Forderhohe
            </SectionTitle>
            <div style={{ display: 'flex', gap: 20 }}>
              {/* KMU */}
              <div
                style={{
                  flex: 1,
                  background: C.card,
                  borderRadius: 20,
                  padding: 32,
                  border: '1px solid rgba(77,174,229,0.15)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, height: 3,
                    background: C.gradientAccent,
                  }}
                />
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.accent,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 12,
                  }}
                >
                  KMU
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 36,
                    fontWeight: 800,
                    color: C.white,
                    letterSpacing: '-0.03em',
                  }}
                >
                  4,2 Mio.
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Maximale jahrliche Zulage
                </div>
                <div
                  style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(77,174,229,0.08)',
                    border: '1px solid rgba(77,174,229,0.12)',
                  }}
                >
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 22, color: C.accent }}>35 %</span>
                  <span style={{ fontSize: 14, color: C.textMuted, marginLeft: 8 }}>Erstattungssatz</span>
                </div>
              </div>

              {/* Grossunternehmen */}
              <div
                style={{
                  flex: 1,
                  background: C.card,
                  borderRadius: 20,
                  padding: 32,
                  border: '1px solid rgba(255,255,255,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, height: 3,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                  }}
                />
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 12,
                  }}
                >
                  Grossunternehmen
                </div>
                <div
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 36,
                    fontWeight: 800,
                    color: C.white,
                    letterSpacing: '-0.03em',
                  }}
                >
                  3,0 Mio.
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.textMuted, marginTop: 4 }}>
                  Maximale jahrliche Zulage
                </div>
                <div
                  style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 22, color: C.white }}>25 %</span>
                  <span style={{ fontSize: 14, color: C.textMuted, marginLeft: 8 }}>Erstattungssatz</span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ===== BRANCHEN ===== */}
        <div className="whitepaper-section" style={{ padding: '56px 0' }}>
          <Section>
            <SectionTitle sub="Die Forschungszulage gilt branchenubergreifend -- diese Sektoren profitieren besonders.">
              Branchen
            </SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {INDUSTRIES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: C.card,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <Icon size={18} color={C.accent} />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      fontWeight: 500,
                      color: C.text,
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ===== DER NOVARIS PROZESS ===== */}
        <div className="whitepaper-section whitepaper-page-break" style={{ padding: '56px 0' }}>
          <Section>
            <SectionTitle sub="Von der ersten Analyse bis zur Auszahlung -- so begleiten wir Sie.">
              Der NOVARIS Prozess
            </SectionTitle>
            <div
              style={{
                background: C.surface,
                borderRadius: 20,
                padding: 32,
                border: '1px solid rgba(77,174,229,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 32,
                boxShadow: '0 1px 1px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3), 0 16px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03) inset',
              }}
            >
              <ProcessStep
                number="1"
                title="Kostenlose Erstanalyse"
                description="Unverbindliche Prufung Ihres F&E-Potenzials. Wir identifizieren forderfähige Projekte und schatzen die mogliche Zulage."
              />
              <div style={{ height: 1, background: 'rgba(77,174,229,0.1)', margin: '0 68px' }} />
              <ProcessStep
                number="2"
                title="Dokumentation & BSFZ-Antrag"
                description="Vollstandige Projektdokumentation und Einreichung des Antrags bei der Bescheinigungsstelle Forschungszulage (BSFZ)."
              />
              <div style={{ height: 1, background: 'rgba(77,174,229,0.1)', margin: '0 68px' }} />
              <ProcessStep
                number="3"
                title="Steuererklärungs-Integration"
                description="Koordination mit Ihrem Steuerberater zur optimalen Einbindung der Forschungszulage in Ihre Steuererklarung."
              />
              <div style={{ height: 1, background: 'rgba(77,174,229,0.1)', margin: '0 68px' }} />
              <ProcessStep
                number="4"
                title="Auszahlung & Honorar"
                description="Erst bei erfolgreicher Bewilligung wird unser Honorar fallig. Kein Erfolg, keine Kosten."
              />
            </div>
          </Section>
        </div>

        {/* ===== WARUM NOVARIS? ===== */}
        <div className="whitepaper-section" style={{ padding: '56px 0' }}>
          <Section>
            <SectionTitle sub="Unsere Versprechen an Sie.">
              Warum NOVARIS?
            </SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <USPCard
                icon={CheckCircle}
                title="100 % erfolgsbasiert"
                description="Unser Honorar ist vollstandig an den Erfolg geknupft. Keine versteckten Kosten, keine Vorauszahlung."
              />
              <USPCard
                icon={Banknote}
                title="0 Euro Vorabkosten"
                description="Kein finanzielles Risiko fur Sie. Wir investieren unsere Expertise, Sie profitieren vom Ergebnis."
              />
              <USPCard
                icon={Shield}
                title="GoBD-konform"
                description="Unsere Dokumentationssysteme entsprechen den Grundsatzen ordnungsmassiger Buchfuhrung und Datenverwaltung."
              />
              <USPCard
                icon={TrendingDown}
                title="Bis zu 40 % gunstiger"
                description="Unsere Konditionen liegen deutlich unter dem Branchendurchschnitt -- bei gleichbleibend hoher Qualitat."
              />
            </div>
          </Section>
        </div>

        {/* ===== CTA ===== */}
        <div className="whitepaper-section" style={{ padding: '56px 0 80px' }}>
          <Section>
            <div
              style={{
                background: C.gradient,
                borderRadius: 24,
                padding: '48px 40px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(30,86,181,0.4), 0 16px 48px rgba(30,86,181,0.2)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -60, right: -60,
                  width: 200, height: 200,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(77,174,229,0.2) 0%, transparent 70%)',
                }}
              />
              <h2
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  color: C.white,
                  letterSpacing: '-0.03em',
                  margin: '0 0 12px',
                  position: 'relative',
                }}
              >
                Kostenlose Erstberatung sichern
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.75)',
                  margin: '0 0 24px',
                  lineHeight: 1.7,
                  position: 'relative',
                }}
              >
                Erfahren Sie in einem unverbindlichen Gesprach, wie viel Forschungszulage
                Ihr Unternehmen erhalten kann.
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: C.accentLight,
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                  position: 'relative',
                }}
              >
                <Phone size={18} />
                novaris-consulting.com
              </div>
            </div>
          </Section>
        </div>

        {/* ===== FOOTER ===== */}
        <div
          className="whitepaper-section"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '24px 0',
          }}
        >
          <Section>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,0.25)',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              NOVARIS Consulting -- Forschungszulage (FZulG) Whitepaper.
              Alle Angaben ohne Gewahr. Stand: Marz 2026.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
