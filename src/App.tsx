import { useEffect, useState } from 'react';
import { analyze, approve, correct, TicketAnalysis } from './api';

const card: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 12,
};

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#94a3b8',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#020617',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 12.5,
  fontFamily: 'inherit',
};

const btnBase: React.CSSProperties = {
  border: 0,
  borderRadius: 7,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  color: '#fff',
  transition: 'filter 0.12s ease',
};

const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 999,
  background: bg,
  color,
  border: `1px solid ${border}`,
});

export default function App() {
  const [ticket, setTicket] = useState('');
  const [result, setResult] = useState<TicketAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const flash = (type: 'ok' | 'err', text: string) => {
    setStatus({ type, text });
    if (type === 'ok') {
      setTimeout(() => setStatus((prev) => (prev?.text === text ? null : prev)), 3000);
    }
  };

  const run = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setStatus(null);
    setResult(null);
    setEditing(false);
    try {
      setResult(await analyze(text));
    } catch (e: any) {
      flash('err', `Error: ${e.message}. Is the backend running?`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chrome.storage.session.get('pendingTicket').then(({ pendingTicket }) => {
      if (pendingTicket) {
        setTicket(pendingTicket);
        chrome.storage.session.remove('pendingTicket');
        run(pendingTicket);
      }
    });
    const l = (c: Record<string, chrome.storage.StorageChange>) => {
      if (c.pendingTicket?.newValue) {
        setTicket(c.pendingTicket.newValue);
        chrome.storage.session.remove('pendingTicket');
        run(c.pendingTicket.newValue);
      }
    };
    chrome.storage.session.onChanged.addListener(l);
    return () => chrome.storage.session.onChanged.removeListener(l);
  }, []);

  const useSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const [r] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() ?? '',
    });
    if (r?.result) setTicket(r.result);
    else flash('err', 'No text selected on the page.');
  };

  const copy = (t: string, what = 'Text') => {
    navigator.clipboard.writeText(t);
    flash('ok', `${what} copied to clipboard`);
  };

  const closePanel = () => {
    window.parent.postMessage('support-ai-close', '*');
  };

  const confidencePct = result
    ? Math.round(result.confidence * (result.confidence <= 1 ? 100 : 1))
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020617' }}>
      {/* Sticky Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '11px 14px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            ✦
          </span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
              Support AI Copilot
            </div>
            <div style={{ fontSize: 10.5, color: '#64748b' }}>Ticket analyzer &amp; reply assistant</div>
          </div>
        </div>
        <button
          onClick={closePanel}
          title="Close"
          style={{
            background: '#1e293b',
            color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: 7,
            width: 26,
            height: 26,
            fontSize: 15,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </header>

      {/* Scrollable Content */}
      <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Input */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={label}>Customer Ticket</span>
            {ticket && (
              <button
                onClick={() => { setTicket(''); setResult(null); setStatus(null); setEditing(false); }}
                style={{ background: 'none', border: 0, color: '#64748b', fontSize: 11, cursor: 'pointer', padding: 0 }}
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            rows={5}
            placeholder="Paste a customer ticket or select text on the page..."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.45 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              style={{ ...btnBase, background: '#4f46e5', flex: 1 }}
              onClick={() => run(ticket)}
              disabled={loading || !ticket.trim()}
            >
              {loading ? 'Analyzing...' : 'Analyze Ticket'}
            </button>
            <button
              style={{ ...btnBase, background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1' }}
              onClick={useSelection}
            >
              Use selection
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {status && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              background: status.type === 'ok' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: status.type === 'ok' ? '#34d399' : '#f87171',
              border: `1px solid ${status.type === 'ok' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            }}
          >
            {status.text}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Metadata Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={pill('rgba(99, 102, 241, 0.14)', '#a5b4fc', 'rgba(99, 102, 241, 0.3)')}>
                {result.category}
              </span>
              <span style={pill('rgba(168, 85, 247, 0.14)', '#d8b4fe', 'rgba(168, 85, 247, 0.3)')}>
                {result.intent}
              </span>
              <span style={pill('rgba(51, 65, 85, 0.45)', '#cbd5e1', '#334155')}>
                {confidencePct}% · {result.engineSource}
              </span>
              {result.requiresHumanReview && (
                <span style={pill('rgba(245, 158, 11, 0.14)', '#fbbf24', 'rgba(245, 158, 11, 0.3)')}>
                  Needs review
                </span>
              )}
            </div>

            {/* Subject */}
            {result.subject && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...label, marginBottom: 0 }}>Subject</span>
                  <button
                    style={{ ...btnBase, background: '#1e293b', border: '1px solid #334155', padding: '3px 8px', fontSize: 11, color: '#cbd5e1' }}
                    onClick={() => copy(result.subject!, 'Subject')}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{result.subject}</div>
              </div>
            )}

            {/* Issue */}
            <div style={card}>
              <div style={label}>Issue</div>
              <div style={{ color: '#cbd5e1' }}>{result.issue}</div>
            </div>

            {/* Recommended Action */}
            <div style={card}>
              <div style={label}>Recommended Action</div>
              <div style={{ color: '#cbd5e1' }}>{result.recommendedAction}</div>
            </div>

            {/* Required Info */}
            {result.requiredInformation?.length > 0 && (
              <div style={card}>
                <div style={label}>Required Information</div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16, color: '#cbd5e1' }}>
                  {result.requiredInformation.map((i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{i}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Required Docs */}
            {result.requiredDocuments?.length > 0 && (
              <div style={card}>
                <div style={label}>Required Documents</div>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16, color: '#cbd5e1' }}>
                  {result.requiredDocuments.map((i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{i}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Response */}
            <div style={{ ...card, borderColor: '#312e81' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ ...label, marginBottom: 0, color: '#a5b4fc' }}>Suggested Response</span>
                <button
                  style={{ ...btnBase, background: '#4f46e5', padding: '3px 9px', fontSize: 11 }}
                  onClick={() => copy(result.suggestedResponse, 'Response')}
                >
                  Copy
                </button>
              </div>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  margin: 0,
                  padding: 10,
                  borderRadius: 8,
                  background: '#020617',
                  border: '1px solid #1e293b',
                  color: '#e2e8f0',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                {result.suggestedResponse}
              </pre>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  style={{ ...btnBase, background: '#4f46e5', flex: 1 }}
                  onClick={() => copy(result.suggestedResponse, 'Response')}
                >
                  Copy Reply
                </button>
                <button
                  style={{ ...btnBase, background: '#d97706' }}
                  onClick={() => {
                    setEditText(result.suggestedResponse);
                    setEditSubject(result.subject ?? '');
                    setEditNotes('');
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
                <button
                  style={{ ...btnBase, background: '#059669' }}
                  disabled={saving}
                  onClick={() => {
                    setSaving(true);
                    approve(ticket, result)
                      .then(() => flash('ok', 'Approved and saved to memory'))
                      .catch(() => flash('err', 'Save failed'))
                      .finally(() => setSaving(false));
                  }}
                >
                  Approve
                </button>
              </div>
            </div>

            {/* Correction Form */}
            {editing && (
              <div style={{ ...card, borderColor: '#b45309' }}>
                <div style={{ ...label, color: '#fbbf24', marginBottom: 8 }}>Correct the Answer</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Subject</div>
                    <input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="Subject"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Response</div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={7}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.45 }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Notes (optional)</div>
                    <input
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Why was this corrected?"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <button
                      style={{ ...btnBase, background: '#059669', flex: 1 }}
                      disabled={saving}
                      onClick={() => {
                        setSaving(true);
                        correct(ticket, result, {
                          suggestedResponse: editText,
                          subject: editSubject || undefined,
                          notes: editNotes || undefined,
                        })
                          .then(() => {
                            flash('ok', 'Correction saved to memory');
                            setEditing(false);
                          })
                          .catch(() => flash('err', 'Save failed'))
                          .finally(() => setSaving(false));
                      }}
                    >
                      {saving ? 'Saving...' : 'Save correction'}
                    </button>
                    <button
                      style={{ ...btnBase, background: '#334155' }}
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
