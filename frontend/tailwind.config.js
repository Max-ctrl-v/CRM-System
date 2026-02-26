/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#e8fafb',
          100: '#c5f2f3',
          200: '#92e5e8',
          300: '#55d2d7',
          400: '#24b8be',
          500: '#0D7377',
          600: '#0b6265',
          700: '#094e51',
          800: '#073d3f',
          900: '#042627',
          950: '#021516',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        pipeline: {
          identified: '#6366f1',
          contacted: '#3b82f6',
          negotiation: '#f59e0b',
          won: '#10b981',
          lost: '#ef4444',
        },
        surface: {
          base: '#f3f4f8',
          raised: '#ffffff',
          elevated: '#ffffff',
          floating: '#ffffff',
        },
        border: {
          DEFAULT: '#e2e5eb',
          light: '#eef0f4',
          strong: '#d1d5db',
        },
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0,0,0,0.06)',
        'sm': '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'card': '0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(13,115,119,0.06)',
        'raised': '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
        'elevated': '0 4px 8px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.08), 0 24px 56px rgba(0,0,0,0.06)',
        'floating': '0 8px 16px rgba(0,0,0,0.1), 0 20px 48px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
        'nav': '0 1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.15)',
        'glow-brand': '0 0 20px rgba(13,115,119,0.18), 0 0 60px rgba(13,115,119,0.08)',
        'glow-accent': '0 0 20px rgba(245,158,11,0.18), 0 0 60px rgba(245,158,11,0.08)',
        'inner-highlight': 'inset 0 1px 0 rgba(255,255,255,0.12)',
        'input': 'inset 0 1px 2px rgba(0,0,0,0.06)',
        'input-focus': '0 0 0 3px rgba(13,115,119,0.15), 0 0 0 1px rgba(13,115,119,0.3)',
      },
      letterSpacing: {
        'display': '-0.03em',
        'tight-display': '-0.04em',
      },
      lineHeight: {
        'body': '1.7',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
