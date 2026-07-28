import { useEffect, useState } from 'react';
import { colors, fonts } from '../theme';
import { DEMO_PERSONAS, personaFor } from '../demoPersonas';
import { getDashboard, listAppointments } from '../api';
import DetailModal from './DetailModal';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function Dashboard({ refreshTrigger }) {
  const [rows, setRows] = useState([]);
  const [dateLabel, setDateLabel] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const appointments = await listAppointments();
      const byName = {};
      for (const appt of appointments) {
        if (!byName[appt.patient_name]) byName[appt.patient_name] = appt;
      }
      const demoAppointments = DEMO_PERSONAS.map((p) => byName[p.name]).filter(Boolean);
      if (demoAppointments.length === 0) {
        if (!cancelled) setRows([]);
        return;
      }

      const date = demoAppointments[0].appointment_time.slice(0, 10);
      if (!cancelled) setDateLabel(new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }));

      const dashboard = await getDashboard(date);
      const summaryByAppointmentId = {};
      for (const s of dashboard.summaries) summaryByAppointmentId[s.appointment_id] = s;

      const merged = demoAppointments.map((appt) => {
        const summary = summaryByAppointmentId[appt.id];
        const persona = personaFor(appt.patient_name);
        const urgent = summary && (summary.urgent_flags || []).length > 0;
        return {
          appointment: appt,
          persona,
          summary,
          statusLabel: !summary ? 'Pending call' : urgent ? 'Urgent — review' : 'Confirmed',
          statusColor: !summary ? colors.muted40 : urgent ? colors.redText : colors.greenText,
          statusBg: !summary ? 'oklch(18% 0.02 280 / 0.06)' : urgent ? 'oklch(62% 0.22 25 / 0.12)' : 'oklch(64% 0.15 150 / 0.12)',
          borderColor: !summary ? 'oklch(18% 0.02 280 / 0.08)' : urgent ? 'oklch(62% 0.22 25 / 0.3)' : 'oklch(18% 0.02 280 / 0.08)',
        };
      });

      if (!cancelled) setRows(merged);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const urgentCount = rows.filter((r) => r.summary && (r.summary.urgent_flags || []).length > 0).length;

  return (
    <div id="dashboard" style={{ background: colors.dashboardBg, padding: '100px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.purple, marginBottom: 14 }}>
              THE DOCTOR'S MORNING
            </div>
            <h2 style={{ fontFamily: fonts.display, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              {dateLabel || 'Today'}
            </h2>
          </div>
          {urgentCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'oklch(62% 0.22 25 / 0.12)', color: colors.redText, padding: '12px 20px', borderRadius: 14, fontSize: 13.5, fontWeight: 600 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.red }} />
              {urgentCount} case{urgentCount > 1 ? 's' : ''} need review before clinic opens
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((row) => (
            <div
              key={row.appointment.id}
              onClick={() => setSelected(row)}
              style={{
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: '70px 1fr auto auto',
                alignItems: 'center',
                gap: 20,
                background: colors.cardBg,
                padding: '18px 24px',
                borderRadius: 16,
                border: `1px solid ${row.borderColor}`,
              }}
            >
              <div style={{ fontFamily: fonts.mono, fontSize: 13, color: colors.muted45 }}>
                {formatTime(row.appointment.appointment_time)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: row.persona.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: fonts.display,
                    flex: 'none',
                  }}
                >
                  {row.persona.initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{row.appointment.patient_name}</div>
                  <div style={{ fontSize: 12, color: colors.muted45 }}>{row.persona.reason}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: colors.muted45 }}>{row.summary ? 'Call completed' : 'Not yet called'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 100, background: row.statusBg, color: row.statusColor, whiteSpace: 'nowrap' }}>
                {row.statusLabel}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ fontSize: 13.5, color: colors.muted45, textAlign: 'center', padding: '40px 0' }}>
              No demo patients found — POST /seed on the backend first.
            </div>
          )}
        </div>
      </div>

      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
