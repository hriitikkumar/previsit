import { useEffect, useState } from 'react';
import { colors, fonts } from '../theme';
import { getCallLog } from '../api';

export default function DetailModal({ row, onClose }) {
  const [transcript, setTranscript] = useState(null);

  useEffect(() => {
    if (!row.summary) return;
    getCallLog(row.summary.call_log_id).then((log) => setTranscript(log.transcript));
  }, [row]);

  const { persona, appointment, summary } = row;
  const urgent = summary && (summary.urgent_flags || []).length > 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(18% 0.02 280 / 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: colors.cardBg, borderRadius: 24, maxWidth: 520, width: '100%', padding: 34, maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: persona.avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: fonts.display,
              }}
            >
              {persona.initials}
            </div>
            <div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 19 }}>{appointment.patient_name}</div>
              <div style={{ fontSize: 12.5, color: colors.muted45 }}>{persona.reason}</div>
            </div>
          </div>
          <div
            onClick={onClose}
            style={{
              cursor: 'pointer',
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'oklch(18% 0.02 280 / 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              color: colors.muted40,
            }}
          >
            ✕
          </div>
        </div>

        {!summary && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: colors.muted45, fontSize: 13.5 }}>
            No call placed yet — start one from the live demo above to see this patient's summary.
          </div>
        )}

        {summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {urgent && (
              <div style={{ background: 'oklch(62% 0.22 25 / 0.1)', color: colors.redText, padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
                ⚠ Urgent — review before appointment
              </div>
            )}
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', marginBottom: 8 }}>Symptoms</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(summary.current_symptoms || []).length === 0 ? (
                  <span style={{ fontSize: 13, color: colors.muted45 }}>None reported</span>
                ) : (
                  summary.current_symptoms.map((s, i) => (
                    <div key={i} style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 100, background: 'oklch(56% 0.20 276 / 0.1)', color: colors.purpleText }}>
                      {s}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', marginBottom: 8 }}>Medications</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{(summary.current_medications || []).join(', ') || 'None reported'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', marginBottom: 8 }}>Fasting compliance</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                {summary.fasting_compliant === null ? 'Not applicable' : summary.fasting_compliant ? 'Compliant' : 'Non-compliant'}
              </div>
            </div>
            <div style={{ background: 'oklch(18% 0.02 280 / 0.04)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', marginBottom: 8 }}>Call transcript</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {transcript === null ? 'Loading…' : transcript || 'No transcript available.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
