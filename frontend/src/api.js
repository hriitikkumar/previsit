export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function req(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  return res.json();
}

export const listAppointments = () => req('/appointments');
export const getDashboard = (date) => req(`/dashboard/${date}`);
export const getCallLog = (callLogId) => req(`/call-logs/${callLogId}`);
export const getCallResult = (callLogId) => req(`/call-logs/${callLogId}/result`);

export const startWebCall = (appointmentId) =>
  req(`/call/web/start/${appointmentId}`, { method: 'POST' });

export const linkVapiCall = (callLogId, vapiCallId) =>
  req(`/call-logs/${callLogId}/link`, {
    method: 'POST',
    body: JSON.stringify({ vapi_call_id: vapiCallId }),
  });

export const listReflexions = (limit = 20) => req(`/reflexions?limit=${limit}`);

export const setReflexionApproval = (reflexionId, approved) =>
  req(`/reflexions/${reflexionId}/approval`, {
    method: 'PATCH',
    body: JSON.stringify({ approved }),
  });
