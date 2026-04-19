import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeadTaleClient } from '../client.js';
import { formatToolError, formatToolResult } from './format.js';

const InputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Free-text keyword search across name, title, and company.'),
  job_titles: z
    .array(z.string())
    .optional()
    .describe('Filter by exact job titles (e.g. ["VP of Engineering", "Director of Marketing"]).'),
  seniority: z
    .array(z.string())
    .optional()
    .describe('Filter by seniority levels (e.g. ["cxo", "vp", "director", "manager"]).'),
  departments: z
    .array(z.string())
    .optional()
    .describe('Filter by departments (e.g. ["engineering", "marketing", "sales"]).'),
  industries: z
    .array(z.string())
    .optional()
    .describe('Filter by industries (e.g. ["saas", "fintech", "healthcare"]).'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  company_name: z.string().optional().describe('Filter by exact company name.'),
  company_id: z
    .string()
    .optional()
    .describe('Filter to contacts at a specific company. Use the id returned by search_companies.'),
  employee_min: z.number().int().positive().optional(),
  employee_max: z.number().int().positive().optional(),
  exclude_revealed: z
    .boolean()
    .optional()
    .describe('Exclude contacts you have already revealed in this account.'),
  page: z.number().int().positive().optional().describe('Page number (1-indexed). Default: 1.'),
  per_page: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe('Results per page. Default: 25. Max: 100.'),
});

export function registerFindLeads(server: McpServer, client: LeadTaleClient) {
  server.registerTool(
    'find_leads',
    {
      title: 'Find leads',
      description:
        'Search LeadTale contacts by structured filters (job title, seniority, department, industry, location, company, employee count). Returns preview records (name, title, company) — use enrich_contacts to reveal email + phone. This tool is free; reveals consume credits.',
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const { query, ...rest } = args;
        const response = await client.call<unknown[]>({
          method: 'GET',
          path: '/api/v1/contacts',
          query: {
            ...(query ? { q: query } : {}),
            ...serializeFilters(rest),
          },
        });
        const total =
          typeof response.meta['total'] === 'number'
            ? (response.meta['total'] as number)
            : Array.isArray(response.data)
              ? response.data.length
              : 0;
        const count = Array.isArray(response.data) ? response.data.length : 0;
        const summary = total === 0
          ? 'Found no matching contacts. Try broadening filters or removing some constraints.'
          : `Found ${total} matching contacts (showing ${count} on this page).`;
        const nextStep =
          total > 0
            ? 'To reveal email and phone for specific contacts, call `enrich_contacts` with their ids. Note: reveals consume credits.'
            : undefined;
        return formatToolResult({
          summary,
          nextStep,
          data: response.data,
          meta: response.meta,
          requestId: response.requestId,
        });
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}

function serializeFilters(filters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}
