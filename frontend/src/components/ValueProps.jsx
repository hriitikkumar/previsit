import { colors, fonts } from '../theme';

function Card({ children, span }) {
  return (
    <div
      style={{
        padding: 30,
        background: colors.cardBg,
        borderRadius: 20,
        border: `1px solid oklch(18% 0.02 280 / 0.07)`,
        gridColumn: span ? 'span 2' : undefined,
      }}
    >
      {children}
    </div>
  );
}

export default function ValueProps() {
  return (
    <div style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 60 }}>
        <h2
          style={{
            fontFamily: fonts.display,
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Built for the two hours before a patient walks in.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          <Card>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'oklch(56% 0.20 276 / 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ width: 14, height: 14, background: colors.purple, borderRadius: 4 }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>Give the staff their time back</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.muted40 }}>
              No receptionist dials a single confirmation call. PreVisit handles the whole roster, every morning, on
              its own.
            </div>
          </Card>
          <Card>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'oklch(72% 0.17 35 / 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ width: 14, height: 14, background: colors.orange, borderRadius: '50%' }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>Compliance you can trust</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.muted40 }}>
              Fasting, medication holds, prep instructions — confirmed patient-by-patient, not assumed.
            </div>
          </Card>
          <Card span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>Nothing urgent slips through</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: colors.muted40, maxWidth: 420 }}>
                  Every call is screened for red-flag symptoms. The doctor sees them before 9am — not buried in a
                  chart.
                </div>
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: colors.redText,
                  background: 'oklch(62% 0.22 25 / 0.1)',
                  padding: '6px 12px',
                  borderRadius: 100,
                  whiteSpace: 'nowrap',
                }}
              >
                3 flagged this week
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
