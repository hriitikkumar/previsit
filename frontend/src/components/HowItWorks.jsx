import { colors, fonts } from '../theme';

const PIPELINE = [
  { n: 1, title: 'Call trigger', desc: 'DSPy builds a prompt from patient history + RAG.', color: colors.purple },
  { n: 2, title: 'Voice call', desc: 'Vapi places the call — GPT-4o, ElevenLabs, Deepgram, in Hinglish.', color: colors.purple },
  { n: 3, title: 'Webhook', desc: 'Transcript posted back, HMAC-verified.', color: colors.orange },
  { n: 4, title: 'Extraction', desc: 'GPT-4o-mini pulls a structured PreVisitSummary.', color: colors.orange },
  { n: 5, title: 'Reflexion', desc: 'Self-critiques the call; lessons feed future prompts.', color: colors.green },
  { n: 6, title: 'Dashboard', desc: 'Doctor sees confirmed visits and urgent flags.', color: colors.green },
];

export default function HowItWorks() {
  return (
    <div id="how-it-works" style={{ background: colors.ink, padding: '100px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.orange, marginBottom: 14 }}>HOW IT WORKS</div>
        <h2
          style={{
            fontFamily: fonts.display,
            color: 'white',
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 56px',
            maxWidth: 640,
          }}
        >
          One pipeline, from the appointment book to the doctor's desk.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 0, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 19,
              left: '5%',
              right: '5%',
              height: 1,
              background: 'oklch(100% 0 0 / 0.15)',
            }}
          />
          {PIPELINE.map((step) => (
            <div key={step.n} style={{ position: 'relative', paddingRight: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: colors.ink,
                  border: `2px solid ${step.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  color: step.color,
                  fontSize: 14,
                  marginBottom: 18,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {step.n}
              </div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 14.5, marginBottom: 8 }}>{step.title}</div>
              <div style={{ color: 'oklch(65% 0.02 280)', fontSize: 12.5, lineHeight: 1.55 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
