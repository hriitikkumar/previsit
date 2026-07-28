import { colors, fonts } from '../theme';

export default function Nav() {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 48px',
        background: 'oklch(97% 0.015 85 / 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${colors.ink} / 0.08`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: colors.purple,
            position: 'relative',
            flex: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: colors.orange,
            }}
          />
        </div>
        <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>
          PreVisit
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#how-it-works" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: colors.ink }}>
          How it works
        </a>
        <a href="#demo" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: colors.ink }}>
          Live demo
        </a>
        <a href="#dashboard" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 500, color: colors.ink }}>
          Dashboard
        </a>
        <a
          href="#contact"
          style={{
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            background: colors.ink,
            padding: '10px 20px',
            borderRadius: 100,
          }}
        >
          Talk to us
        </a>
      </div>
    </div>
  );
}
