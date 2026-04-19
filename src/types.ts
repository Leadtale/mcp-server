export type LeadTaleEnvelope<T> = {
  data: T;
  meta: LeadTaleMeta;
};

export type LeadTaleMeta = {
  credits_used?: number;
  credits_remaining?: number;
  total?: number;
  page?: number;
  per_page?: number;
  [key: string]: unknown;
};

export type LeadTaleResponse<T> = {
  data: T;
  meta: LeadTaleMeta;
  requestId?: string;
};

export class LeadTaleError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'LeadTaleError';
  }
}
