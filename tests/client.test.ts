import { describe, expect, it, vi, afterEach } from 'vitest';
import { request } from 'undici';
import { LeadTaleClient } from '../src/client.js';
import { LeadTaleError } from '../src/types.js';

vi.mock('undici', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

function okResponse(body: unknown, headers: Record<string, string> = {}) {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', ...headers },
    body: { text: async () => JSON.stringify(body) },
  } as unknown as Awaited<ReturnType<typeof request>>;
}

function errResponse(status: number, body: unknown) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: { text: async () => JSON.stringify(body) },
  } as unknown as Awaited<ReturnType<typeof request>>;
}

describe('LeadTaleClient', () => {
  afterEach(() => {
    mockedRequest.mockReset();
  });

  it('sends Bearer auth and returns the envelope', async () => {
    mockedRequest.mockResolvedValueOnce(
      okResponse(
        { data: [{ id: 'c_1', name: 'Ada' }], meta: { total: 1, credits_used: 0 } },
        { 'x-request-id': 'req_abc123' },
      ),
    );

    const client = new LeadTaleClient({ apiKey: 'lt_test_xyz', baseUrl: 'https://api.example.com' });
    const res = await client.call<unknown[]>({ method: 'GET', path: '/api/v1/contacts' });

    expect(mockedRequest).toHaveBeenCalledOnce();
    const [url, opts] = mockedRequest.mock.calls[0]!;
    expect(url).toBe('https://api.example.com/api/v1/contacts');
    expect((opts as { headers: Record<string, string> }).headers['authorization']).toBe(
      'Bearer lt_test_xyz',
    );
    expect(res.data).toEqual([{ id: 'c_1', name: 'Ada' }]);
    expect(res.meta['total']).toBe(1);
    expect(res.requestId).toBe('req_abc123');
  });

  it('serializes array query params as comma-joined strings', async () => {
    mockedRequest.mockResolvedValueOnce(okResponse({ data: [], meta: {} }));
    const client = new LeadTaleClient({ apiKey: 'k', baseUrl: 'https://api.example.com' });
    await client.call({
      method: 'GET',
      path: '/api/v1/contacts',
      query: { seniority: ['vp', 'director'], page: 2 },
    });
    const [url] = mockedRequest.mock.calls[0]!;
    expect(url).toContain('seniority=vp%2Cdirector');
    expect(url).toContain('page=2');
  });

  it('throws LeadTaleError with message from response body on 4xx', async () => {
    mockedRequest.mockResolvedValueOnce(errResponse(401, { message: 'Invalid API key' }));
    const client = new LeadTaleClient({ apiKey: 'bad', baseUrl: 'https://api.example.com' });
    await expect(
      client.call({ method: 'GET', path: '/api/v1/account' }),
    ).rejects.toMatchObject({ name: 'LeadTaleError', status: 401, message: 'Invalid API key' });
  });

  it('falls back to status-specific message when body has no message field', async () => {
    mockedRequest.mockResolvedValueOnce(errResponse(429, { error_code: 'RATE_LIMIT' }));
    const client = new LeadTaleClient({ apiKey: 'k', baseUrl: 'https://api.example.com' });
    try {
      await client.call({ method: 'GET', path: '/api/v1/contacts' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(LeadTaleError);
      expect((err as LeadTaleError).status).toBe(429);
      expect((err as LeadTaleError).message).toMatch(/rate limit/i);
    }
  });

  it('strips trailing slash on baseUrl', async () => {
    mockedRequest.mockResolvedValueOnce(okResponse({ data: null, meta: {} }));
    const client = new LeadTaleClient({ apiKey: 'k', baseUrl: 'https://api.example.com/' });
    await client.call({ method: 'GET', path: '/api/v1/account' });
    const [url] = mockedRequest.mock.calls[0]!;
    expect(url).toBe('https://api.example.com/api/v1/account');
  });

  it('rejects missing apiKey at construction', () => {
    expect(() => new LeadTaleClient({ apiKey: '' })).toThrow(/apiKey/);
  });
});
