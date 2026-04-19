import { request } from 'undici';
import { LeadTaleError, type LeadTaleResponse } from './types.js';

const DEFAULT_BASE = 'https://api.leadtale.com';
const USER_AGENT = '@leadtale/mcp-server';

type RequestOptions = {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  path: string;
  query?: Record<string, string | number | boolean | string[] | undefined>;
  body?: unknown;
};

export class LeadTaleClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly version: string;

  constructor(opts: { apiKey: string; baseUrl?: string; version?: string }) {
    if (!opts.apiKey) {
      throw new Error('LeadTaleClient requires an apiKey.');
    }
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this.version = opts.version ?? '0.1.0';
  }

  async call<T>(opts: RequestOptions): Promise<LeadTaleResponse<T>> {
    const url = this.buildUrl(opts.path, opts.query);
    const res = await request(url, {
      method: opts.method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': `${USER_AGENT}/${this.version}`,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });

    const requestId =
      typeof res.headers['x-request-id'] === 'string'
        ? res.headers['x-request-id']
        : undefined;

    const text = await res.body.text();
    const parsed = text ? safeJsonParse(text) : undefined;

    if (res.statusCode >= 400) {
      throw new LeadTaleError(
        res.statusCode,
        extractErrorMessage(parsed, res.statusCode),
        parsed,
        requestId,
      );
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new LeadTaleError(
        res.statusCode,
        'LeadTale returned an empty or non-JSON response.',
        text,
        requestId,
      );
    }

    const envelope = parsed as { data?: unknown; meta?: Record<string, unknown> };
    return {
      data: (envelope.data ?? parsed) as T,
      meta: (envelope.meta ?? {}) as LeadTaleResponse<T>['meta'],
      requestId,
    };
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          if (value.length > 0) url.searchParams.set(key, value.join(','));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractErrorMessage(parsed: unknown, status: number): string {
  if (parsed && typeof parsed === 'object') {
    const p = parsed as Record<string, unknown>;
    if (typeof p['message'] === 'string') return p['message'];
    if (typeof p['error'] === 'string') return p['error'];
  }
  switch (status) {
    case 401:
      return 'Invalid API key. Check LEADTALE_API_KEY in your MCP config.';
    case 403:
      return 'Your API key does not have permission for this operation. Check the key\'s scopes in LeadTale → Settings → Developer.';
    case 404:
      return 'Resource not found.';
    case 429:
      return 'Rate limit exceeded. Wait a moment and try again, or upgrade your plan.';
    default:
      return `LeadTale API error (HTTP ${status}).`;
  }
}
