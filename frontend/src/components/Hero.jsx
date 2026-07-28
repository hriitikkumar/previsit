import { colors, fonts } from '../theme';

const stats = [
  { value: '4.5 min', label: 'avg. call, zero staff time' },
  { value: '31%', label: 'fewer no-shows in pilot' },
  { value: '100%', label: 'patients screened, not just booked' },
];

export default function Hero() {
  return (
    <div style={{ position: 'relative', background: colors.ink, padding: '110px 48px 90px', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'oklch(56% 0.20 276 / 0.35)',
          filter: 'blur(60px)',
          top: -180,
          right: -140,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'oklch(72% 0.17 35 / 0.28)',
          filter: 'blur(50px)',
          bottom: -120,
          right: 220,
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gap: 64,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 100,
              background: 'oklch(100% 0 0 / 0.08)',
              border: '1px solid oklch(100% 0 0 / 0.14)',
              marginBottom: 26,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: colors.orange }} />
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'oklch(90% 0.01 280)', fontFamily: fonts.mono }}>
              Live at Bhopal Institute of Gastroenterology
            </span>
          </div>
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: 'clamp(40px,4.6vw,68px)',
              lineHeight: 1.03,
              letterSpacing: '-0.03em',
              color: 'white',
              margin: '0 0 26px',
              fontWeight: 700,
            }}
          >
            Every patient gets a call.
            <br />
            No doctor has to make it.
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: 'oklch(80% 0.02 280)', maxWidth: 520, margin: '0 0 36px' }}>
            PreVisit calls patients before their appointment, in Hinglish, to confirm they're coming, check fasting
            and meds, and flag anything urgent — before the doctor ever sees them.
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <a
              href="#demo"
              style={{
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
                color: colors.ink,
                background: 'white',
                padding: '15px 26px',
                borderRadius: 100,
              }}
            >
              Talk to PreVisit live →
            </a>
            <a href="#how-it-works" style={{ textDecoration: 'none', fontWeight: 500, fontSize: 15, color: 'white', padding: '15px 10px' }}>
              See the pipeline
            </a>
          </div>
          <div style={{ display: 'flex', gap: 40, marginTop: 56 }}>
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: 'white' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'oklch(70% 0.02 280)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', justifySelf: 'center' }}>
          <div
            style={{
              width: 280,
              background: 'oklch(22% 0.02 280)',
              border: '1px solid oklch(100% 0 0 / 0.12)',
              borderRadius: 32,
              padding: '22px 20px',
              boxShadow: '0 30px 80px oklch(0% 0 0 / 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: colors.purple,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontFamily: fonts.display,
                }}
              >
                RS
              </div>
              <div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>Ramesh Sharma</div>
                <div style={{ color: 'oklch(65% 0.02 280)', fontSize: 12 }}>Calling · 00:24</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 3, height: 46, marginBottom: 20 }}>
              {[60, 90, 40, 100, 55, 75, 35].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: `${h}%`,
                    borderRadius: 2,
                    background: colors.orange,
                    animation: `wave 1.1s ease-in-out infinite ${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                background: 'oklch(28% 0.02 280)',
                borderRadius: 14,
                padding: 14,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: 'oklch(85% 0.02 280)',
                fontFamily: fonts.mono,
              }}
            >
              "Kal aapki appointment hai 10 baje, aur ultrasound se pehle fasting zaroori hai..."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
