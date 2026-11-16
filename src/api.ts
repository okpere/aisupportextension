const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export interface TicketAnalysis {
  subject?: string;
  category: string;
  intent: string;
  issue: string;
  requiredInformation: string[];
  requiredDocuments: string[];
  recommendedAction: string;
  suggestedResponse: string;
  confidence: number;
  requiresHumanReview: boolean;
  matchedRules?: string[];
  matchedTemplate?: string;
  engineSource: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json();
}

export const analyze = (ticket: string) => post<TicketAnalysis>('/ai/analyze', { ticket });
export const approve = (ticketText: string, a: TicketAnalysis) =>
  post('/ai/learn', { ...a, ticketText, feedbackType: 'approved' });
export const correct = (ticketText: string, a: TicketAnalysis, fix: { suggestedResponse: string; subject?: string; notes?: string }) =>
  post('/ai/learn', { ...a, ...fix, ticketText, feedbackType: 'correction' });
