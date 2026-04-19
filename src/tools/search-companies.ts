import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeadTaleClient } from '../client.js';
import { formatToolError, formatToolResult } from './format.js';

const InputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Free-text keyword search across company name and domain.'),
  industries: z.array(z.string()).optional().describe('Filter by industries.'),
  technologies: z
    .array(z.string())
    .optional()
    .describe('Filter by tech stack tags (e.g. ["Stripe", "Segment", "Snowflake"]).'),
  city: z.string().optional(),
  state: z.string().optional(),
  employee_min: z.number().int().positive().optional(),
  employee_max: z.number().int().positive().optional(),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
});

export function registerSearchCompanies(server: McpServer, client: LeadTaleClient) {
  server.registerTool(
    'search_companies',
    {
      title: 'Search companies',
      description:
        'Search LeadTale companies by industry, size, tech stack, or location. Returns full company records. To find contacts at a specific company, use find_leads with that company_id. This tool is free.',
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const { query, ...rest } = args;
        const response = await client.call<unknown[]>({
          method: 'GET',
          path: '/api/v1/companies',
          query: {
            ...(query ? { q: query } : {}),
            ...rest,
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
          ? 'Found no matching companies. Try broader filters.'
          : `Found ${total} companies (showing ${count} on this page).`;
        const nextStep =
          total > 0
            ? 'To find contacts at one of these companies, call `find_leads` with `company_id` set to the company\'s id.'
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
