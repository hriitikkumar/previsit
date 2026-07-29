import { useEffect, useRef, useState } from 'react';
import * as VapiModule from '@vapi-ai/web';
import { colors, fonts } from '../theme';

// The production Rollup build sometimes nests this CJS package's default
// export one level deeper (VapiModule.default.default) than the dev server
// does — handle both shapes defensively instead of assuming one.
const Vapi = VapiModule.default?.default ?? VapiModule.default ?? VapiModule;
import { DEMO_PERSONAS, personaFor } from '../demoPersonas';
import { getCallResult, linkVapiCall, listAppointments, startWebCall } from '../api';

const STAGE_LABELS = {
  idle: 'Not called yet',
  connecting: 'Connecting…',
  calling: 'Call in progress',
  processing: 'Processing…',
  done: 'Call complete',
  error: 'Call failed',
};

export default function LiveDemo({ onCallCompleted }) {
  const [appointmentsByName, setAppointmentsByName] = useState({});
  const [activeName, setActiveName] = useState(null);
  const [stage, setStage] = useState('idle');
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [callStatusByName, setCallStatusByName] = useState({});
  const [micLevel, setMicLevel] = useState(0);
  const [userIsSpeaking, setUserIsSpeaking] = useState(false);

  const vapiRef = useRef(null);
  const pollRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const hasErroredRef = useRef(false);

  useEffect(() => {
    listAppointments().then((appointments) => {
      const byName = {};
      for (const appt of appointments) {
        // API is ordered newest-first; keep only the most recent appointment per name.
        if (!byName[appt.patient_name]) byName[appt.patient_name] = appt;
      }
      const ordered = {};
      for (const persona of DEMO_PERSONAS) {
        if (byName[persona.name]) ordered[persona.name] = byName[persona.name];
      }
      setAppointmentsByName(ordered);
      const firstName = Object.keys(ordered)[0];
      if (firstName) setActiveName(firstName);
    });

    return () => {
      clearInterval(pollRef.current);
      vapiRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptLines]);

  function beginPolling(callLogId, name) {
    clearInterval(pollRef.current);
    const maxAttempts = 45; // ~90s — a real call's extraction+reflexion finishes in ~5-10s
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await getCallResult(callLogId);
        if (res.stage === 'done') {
          clearInterval(pollRef.current);
          setResult(res);
          setStage('done');
          const urgent = (res.summary?.urgent_flags || []).length > 0;
          setCallStatusByName((prev) => ({ ...prev, [name]: urgent ? 'urgent' : 'confirmed' }));
          onCallCompleted?.();
          return;
        }
      } catch {
        // transient — keep polling
      }
      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        setErrorMsg('Timed out waiting for the call to process. The call may not have connected — try again.');
        setStage('error');
      }
    }, 2000);
  }

  async function startCall(name) {
    if (stage === 'connecting' || stage === 'calling' || stage === 'processing') return;
    const appt = appointmentsByName[name];
    if (!appt) return;

    setActiveName(name);
    setStage('connecting');
    setTranscriptLines([]);
    setResult(null);
    setErrorMsg(null);

    try {
      const resp = await startWebCall(appt.id);

      if (!vapiRef.current) vapiRef.current = new Vapi(resp.public_key);
      const vapi = vapiRef.current;
      vapi.removeAllListeners();

      hasErroredRef.current = false;

      vapi.on('call-start', () => setStage('calling'));
      vapi.on('volume-level', (level) => setMicLevel(level));
      vapi.on('local-volume-level', (level) => setUserIsSpeaking(level > 0.05));
      vapi.on('message', (message) => {
        if (message?.type === 'transcript' && message?.transcriptType === 'final') {
          const speaker = message.role === 'user' ? 'Patient' : 'PreVisit';
          setTranscriptLines((prev) => {
            // Deepgram finalizes per-phrase, not per-utterance — merge consecutive
            // fragments from the same speaker into one bubble instead of a new one each time.
            const last = prev[prev.length - 1];
            if (last && last.speaker === speaker) {
              return [...prev.slice(0, -1), { speaker, text: `${last.text} ${message.transcript}` }];
            }
            return [...prev, { speaker, text: message.transcript }];
          });
        }
      });
      vapi.on('call-end', () => {
        if (hasErroredRef.current) return; // error handler already ended this attempt — don't also start polling
        setStage('processing');
        beginPolling(resp.call_log_id, name);
      });
      vapi.on('error', (err) => {
        hasErroredRef.current = true;
        setErrorMsg(err?.message || err?.errorMsg || 'Call failed — check the console.');
        setStage('error');
      });

      const call = await vapi.start(resp.assistant_config);
      if (call?.id) {
        linkVapiCall(resp.call_log_id, call.id).catch(() => {});
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not start the call.');
      setStage('error');
    }
  }

  function endCall() {
    vapiRef.current?.stop();
    setStage((s) => (s === 'calling' ? 'processing' : s));
  }

  const activePersona = activeName ? personaFor(activeName) : null;

  return (
    <div id="demo" style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.purple, marginBottom: 14 }}>
          TRY IT YOURSELF
        </div>
        <h2 style={{ fontFamily: fonts.display, fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
          Pick a patient. Be the patient.
        </h2>
        <p style={{ fontSize: 15.5, color: colors.muted40, maxWidth: 560, margin: '0 auto' }}>
          This is a real Vapi voice call, running the real DSPy prompt, extraction, and reflexion pipeline. Allow
          microphone access and talk back — you're playing the patient.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
        {Object.keys(appointmentsByName).map((name) => {
          const persona = personaFor(name);
          const isActive = name === activeName;
          const status = callStatusByName[name];
          const dot = status === 'urgent' ? colors.red : status === 'confirmed' ? colors.green : 'oklch(75% 0.02 280)';
          return (
            <div
              key={name}
              onClick={() => startCall(name)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px 10px 10px',
                borderRadius: 100,
                border: `2px solid ${isActive ? persona.avatarColor : 'oklch(18% 0.02 280 / 0.1)'}`,
                background: isActive ? colors.bg : colors.cardBg,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: persona.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: fonts.display,
                }}
              >
                {persona.initials}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>{name}</div>
                <div style={{ fontSize: 11, color: colors.muted45 }}>{persona.reason}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, marginLeft: 4 }} />
            </div>
          );
        })}
        {Object.keys(appointmentsByName).length === 0 && (
          <div style={{ fontSize: 13.5, color: colors.muted45 }}>
            No demo patients found — POST /seed on the backend first.
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          background: colors.cardBg,
          borderRadius: 28,
          border: '1px solid oklch(18% 0.02 280 / 0.08)',
          overflow: 'hidden',
          boxShadow: '0 20px 60px oklch(18% 0.02 280 / 0.06)',
        }}
      >
        {/* phone / transcript */}
        <div style={{ padding: 36, borderRight: '1px solid oklch(18% 0.02 280 / 0.08)', background: colors.ink }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activePersona && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: activePersona.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: fonts.display,
                  }}
                >
                  {activePersona.initials}
                </div>
              )}
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14.5 }}>{activeName || 'Pick a patient'}</div>
                <div style={{ color: 'oklch(65% 0.02 280)', fontSize: 12 }}>{STAGE_LABELS[stage]}</div>
              </div>
            </div>
            {stage === 'calling' && (
              <div style={{ display: 'flex', alignItems: 'end', gap: 2.5, height: 26 }}>
                {[60, 100, 45, 80].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: `${Math.max(20, h * (0.4 + micLevel))}%`,
                      borderRadius: 2,
                      background: colors.orange,
                      animation: `wave 1.1s ease-in-out infinite ${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 280 }}>
            {stage === 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, textAlign: 'center' }}>
                <p style={{ color: 'oklch(65% 0.02 280)', fontSize: 13.5, margin: '0 0 18px', maxWidth: 280 }}>
                  No call placed yet. Start one to talk to PreVisit live, in Hinglish, as {activeName || 'a patient'}.
                </p>
                <button
                  onClick={() => activeName && startCall(activeName)}
                  disabled={!activeName}
                  style={{
                    border: 'none',
                    cursor: activeName ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    fontSize: 14,
                    color: colors.ink,
                    background: 'white',
                    padding: '13px 24px',
                    borderRadius: 100,
                  }}
                >
                  Start call
                </button>
              </div>
            )}

            {stage === 'connecting' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'oklch(65% 0.02 280)', fontSize: 13.5 }}>
                Connecting — allow microphone access if prompted…
              </div>
            )}

            {transcriptLines.map((line, i) => (
              <div
                key={i}
                style={{
                  alignSelf: line.speaker === 'PreVisit' ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                  background: line.speaker === 'PreVisit' ? 'oklch(30% 0.02 280)' : colors.purple,
                  color: 'white',
                  padding: '10px 14px',
                  borderRadius: 14,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {line.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />

            {stage === 'calling' && (
              <div
                style={{
                  alignSelf: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  fontFamily: fonts.mono,
                  color: userIsSpeaking ? colors.orange : 'oklch(50% 0.02 280)',
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: userIsSpeaking ? colors.orange : 'oklch(50% 0.02 280)',
                    animation: userIsSpeaking ? 'pulse 0.6s ease-in-out infinite' : 'none',
                  }}
                />
                {userIsSpeaking ? 'Hearing you…' : 'Mic is live — start talking'}
              </div>
            )}

            {stage === 'calling' && (
              <div style={{ alignSelf: 'center', marginTop: 8 }}>
                <button
                  onClick={endCall}
                  style={{
                    border: '1px solid oklch(62% 0.22 25 / 0.4)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12.5,
                    color: colors.red,
                    background: 'transparent',
                    padding: '8px 18px',
                    borderRadius: 100,
                  }}
                >
                  End call
                </button>
              </div>
            )}

            {stage === 'processing' && (
              <div style={{ alignSelf: 'center', color: 'oklch(65% 0.02 280)', fontSize: 12, fontFamily: fonts.mono, marginTop: 8 }}>
                — call ended, processing transcript —
              </div>
            )}

            {stage === 'error' && (
              <div style={{ alignSelf: 'center', color: colors.red, fontSize: 12.5, textAlign: 'center', marginTop: 8 }}>
                {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* extraction / reflexion */}
        <div style={{ padding: 36 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.muted45, marginBottom: 20, letterSpacing: '0.02em' }}>
            PIPELINE OUTPUT
          </div>

          {(stage === 'idle' || stage === 'connecting' || stage === 'calling') && (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(60% 0.02 280)', fontSize: 13.5, textAlign: 'center' }}>
              Extraction and reflexion will appear here once the call ends.
            </div>
          )}

          {stage === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['Extracting summary (GPT-4o-mini)', 'Running reflexion self-critique', 'Saving to dashboard'].map((label) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flex: 'none', border: `2px solid ${colors.purple}`, position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        inset: -2,
                        borderRadius: '50%',
                        border: '2px solid transparent',
                        borderTopColor: colors.purple,
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {stage === 'error' && (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.red, fontSize: 13.5, textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          {stage === 'done' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(result.summary.urgent_flags || []).length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'oklch(62% 0.22 25 / 0.1)',
                    border: '1px solid oklch(62% 0.22 25 / 0.25)',
                    color: colors.redDark,
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.red, animation: 'pulse 1.4s ease-in-out infinite' }} />
                  Urgent — flagged for doctor review
                </div>
              )}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                  Symptoms
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(result.summary.current_symptoms || []).length === 0 ? (
                    <span style={{ fontSize: 13, color: colors.muted45 }}>None reported</span>
                  ) : (
                    result.summary.current_symptoms.map((s, i) => (
                      <div key={i} style={{ fontSize: 12.5, padding: '6px 12px', borderRadius: 100, background: 'oklch(56% 0.20 276 / 0.1)', color: colors.purpleText }}>
                        {s}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                  Medications
                </div>
                <div style={{ fontSize: 13.5, color: 'oklch(25% 0.02 280)', lineHeight: 1.6 }}>
                  {(result.summary.current_medications || []).join(', ') || 'None reported'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    Fasting
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {result.summary.fasting_compliant === null
                      ? 'Not applicable'
                      : result.summary.fasting_compliant
                      ? 'Compliant'
                      : 'Non-compliant'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: colors.muted45, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    Reflexion score
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{result.reflexion.overall_score}/10</div>
                </div>
              </div>
              <div style={{ background: 'oklch(72% 0.17 35 / 0.08)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'oklch(50% 0.17 35)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Reflexion note (feeds next call)
                </div>
                <div style={{ fontSize: 13, color: 'oklch(30% 0.05 40)', lineHeight: 1.55, fontStyle: 'italic' }}>
                  "{result.reflexion.key_learning}"
                </div>
              </div>
              <a
                href="#dashboard"
                style={{ textDecoration: 'none', textAlign: 'center', fontWeight: 600, fontSize: 13.5, color: 'white', background: colors.ink, padding: 12, borderRadius: 12 }}
              >
                View on doctor's dashboard →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
