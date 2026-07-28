import { colors, fonts } from '../theme';

export default function Footer() {
  return (
    <div id="contact" style={{ background: colors.ink, padding: '100px 48px', textAlign: 'center' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: fonts.display,
            color: 'white',
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 16px',
          }}
        >
          Want this running for your clinic?
        </h2>
        <p style={{ color: 'oklch(70% 0.02 280)', fontSize: 15.5, margin: '0 0 32px' }}>
          We're onboarding a handful of clinics this quarter. Fifteen minutes to see if it fits.
        </p>
        <a
          href="mailto:hello@previsit.ai"
          style={{
            textDecoration: 'none',
            display: 'inline-block',
            fontWeight: 600,
            fontSize: 15,
            color: colors.ink,
            background: 'white',
            padding: '16px 32px',
            borderRadius: 100,
          }}
        >
          Book a walkthrough
        </a>
      </div>
      <div
        style={{
          marginTop: 80,
          paddingTop: 28,
          borderTop: '1px solid oklch(100% 0 0 / 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          color: 'oklch(55% 0.02 280)',
          fontSize: 12.5,
          maxWidth: 1200,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <span>PreVisit — pre-appointment voice AI</span>
        <span>Built for Bhopal Institute of Gastroenterology</span>
      </div>
    </div>
  );
}
