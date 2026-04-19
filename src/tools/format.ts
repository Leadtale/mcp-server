import { LeadTaleError, type LeadTaleMeta } from '../types.js';

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function formatToolResult(opts: {
  summary: string;
  nextStep?: string;
  data: unknown;
  meta: LeadTaleMeta;
  requestId?: string;
}): ToolResult {
  const lines: string[] = [opts.summary];

  const creditsLine = formatCreditsLine(opts.meta);
  if (creditsLine) lines.push(creditsLine);

  if (opts.nextStep) lines.push(opts.nextStep);

  return {
    content: [{ type: 'text', text: lines.join('\n\n') }],
    structuredContent: {
      data: opts.data,
      meta: opts.meta,
      ...(opts.requestId ? { request_id: opts.requestId } : {}),
    },
  };
}

export function formatToolError(err: unknown): ToolResult {
  if (err instanceof LeadTaleError) {
    const tail = err.requestId ? ` (request id: ${err.requestId})` : '';
    return {
      isError: true,
      content: [
        { type: 'text', text: `LeadTale API error [HTTP ${err.status}]: ${err.message}${tail}` },
      ],
      structuredContent: {
        error: { status: err.status, message: err.message, details: err.details },
      },
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: 'text', text: `Unexpected error: ${message}` }],
  };
}

function formatCreditsLine(meta: LeadTaleMeta): string {
  const used = meta.credits_used;
  const remaining = meta.credits_remaining;
  if (used === undefined && remaining === undefined) return '';
  const parts: string[] = [];
  if (used !== undefined && used > 0) parts.push(`${used} used this call`);
  if (remaining !== undefined) parts.push(`${remaining} remaining on your account`);
  return parts.length ? `Credits: ${parts.join(', ')}.` : '';
}
