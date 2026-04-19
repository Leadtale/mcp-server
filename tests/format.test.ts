import { describe, expect, it } from 'vitest';
import { formatToolError, formatToolResult } from '../src/tools/format.js';
import { LeadTaleError } from '../src/types.js';

describe('formatToolResult', () => {
  it('includes summary, credits line, and next step in text content', () => {
    const res = formatToolResult({
      summary: 'Found 42 contacts.',
      nextStep: 'Reveal them with enrich_contacts.',
      data: [],
      meta: { credits_used: 0, credits_remaining: 1234 },
    });
    const text = res.content[0]!.text;
    expect(text).toContain('Found 42 contacts.');
    expect(text).toContain('1234 remaining');
    expect(text).toContain('enrich_contacts');
  });

  it('omits credits line when neither used nor remaining is set', () => {
    const res = formatToolResult({
      summary: 'Done.',
      data: {},
      meta: {},
    });
    expect(res.content[0]!.text).toBe('Done.');
  });

  it('attaches data + meta to structuredContent', () => {
    const res = formatToolResult({
      summary: 'x',
      data: { id: 'c_1' },
      meta: { total: 1 },
      requestId: 'req_abc',
    });
    expect(res.structuredContent).toEqual({
      data: { id: 'c_1' },
      meta: { total: 1 },
      request_id: 'req_abc',
    });
  });
});

describe('formatToolError', () => {
  it('marks isError and surfaces status + request id for LeadTaleError', () => {
    const err = new LeadTaleError(429, 'Rate limit exceeded', null, 'req_xyz');
    const res = formatToolError(err);
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('HTTP 429');
    expect(res.content[0]!.text).toContain('req_xyz');
  });

  it('handles unknown errors without throwing', () => {
    const res = formatToolError('something weird');
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('something weird');
  });
});
