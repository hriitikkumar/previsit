import { useEffect, useState } from 'react';
import { colors, fonts } from '../theme';
import { listReflexions, setReflexionApproval } from '../api';

export default function ReflexionLessons({ refreshTrigger }) {
  const [lessons, setLessons] = useState([]);
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    listReflexions(10).then(setLessons);
  }, [refreshTrigger]);

  async function toggle(lesson) {
    setPendingId(lesson.id);
    try {
      const updated = await setReflexionApproval(lesson.id, !lesson.approved);
      setLessons((prev) => prev.map((l) => (l.id === updated.id ? { ...l, approved: updated.approved } : l)));
    } finally {
      setPendingId(null);
    }
  }

  if (lessons.length === 0) return null;

  return (
    <div style={{ background: colors.dashboardBg, padding: '0 48px 100px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.purple, marginBottom: 14 }}>
          WHAT THE AGENT IS LEARNING
        </div>
        <h3 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Reflexion lessons feeding the next call
        </h3>
        <p style={{ fontSize: 13.5, color: colors.muted45, margin: '0 0 28px', maxWidth: 560 }}>
          After every call, the agent critiques itself. Only approved lessons from complete calls are used in future
          prompts — reject one here if it looks wrong.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                alignItems: 'center',
                gap: 20,
                background: colors.cardBg,
                padding: '16px 22px',
                borderRadius: 14,
                border: `1px solid oklch(18% 0.02 280 / ${lesson.approved ? '0.07' : '0.15'})`,
                opacity: lesson.approved ? 1 : 0.55,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>"{lesson.key_learning}"</div>
                <div style={{ fontSize: 11.5, color: colors.muted45, marginTop: 6 }}>
                  {lesson.patient_name} · score {lesson.overall_score}/10
                </div>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: 100,
                  whiteSpace: 'nowrap',
                  background: lesson.approved ? 'oklch(64% 0.15 150 / 0.12)' : 'oklch(18% 0.02 280 / 0.08)',
                  color: lesson.approved ? colors.greenText : colors.muted45,
                }}
              >
                {lesson.approved ? 'Live' : 'Rejected'}
              </div>
              <button
                onClick={() => toggle(lesson)}
                disabled={pendingId === lesson.id}
                style={{
                  border: `1px solid ${lesson.approved ? 'oklch(62% 0.22 25 / 0.4)' : 'oklch(64% 0.15 150 / 0.4)'}`,
                  cursor: pendingId === lesson.id ? 'wait' : 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  color: lesson.approved ? colors.red : colors.greenText,
                  background: 'transparent',
                  padding: '7px 14px',
                  borderRadius: 100,
                  whiteSpace: 'nowrap',
                }}
              >
                {lesson.approved ? 'Reject' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
