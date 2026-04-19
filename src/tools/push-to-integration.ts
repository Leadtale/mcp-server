import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeadTaleClient } from '../client.js';
import { formatToolError, formatToolResult } from './format.js';

const InputSchema = z.object({
  list_id: z
    .string()
    .optional()
    .describe(
      'List id to push. Required unless list_integrations is true. Get from manage_list (action: "list").',
    ),
  integration_id: z
    .string()
    .optional()
    .describe('Integration id to push to. Call with list_integrations=true first to see options.'),
  list_integrations: z
    .boolean()
    .optional()
    .describe(
      'When true, return the account\'s connected integrations instead of pushing. Use this first to discover integration_ids.',
    ),
  job_id: z
    .string()
    .optional()
    .describe(
      'If provided, returns the status of an existing push job instead of starting a new one.',
    ),
});

export function registerPushToIntegration(server: McpServer, client: LeadTaleClient) {
  server.registerTool(
    'push_to_integration',
    {
      title: 'Push list to integration',
      description:
        'Push a contact list to a connected integration (CRM, outreach tool, etc.). Call with list_integrations=true first to see available integrations. Then call with list_id + integration_id to push. Pushes run asynchronously — poll with job_id to check status. This tool is free; the underlying integration may have its own rate limits.',
      inputSchema: InputSchema,
    },
    async (args) => {
      try {
        if (args.list_integrations) {
          const response = await client.call<unknown[]>({
            method: 'GET',
            path: '/api/v1/integrations',
          });
          const count = Array.isArray(response.data) ? response.data.length : 0;
          return formatToolResult({
            summary:
              count === 0
                ? 'No integrations connected. Connect one in LeadTale → Settings → Integrations.'
                : `Found ${count} connected integration(s).`,
            nextStep:
              count > 0
                ? 'Pick an integration id from the result, then call this tool again with list_id + integration_id.'
                : undefined,
            data: response.data,
            meta: response.meta,
            requestId: response.requestId,
          });
        }

        if (args.job_id) {
          const response = await client.call<{ status?: string }>({
            method: 'GET',
            path: `/api/v1/jobs/${encodeURIComponent(args.job_id)}`,
          });
          const status = (response.data as { status?: string })?.status ?? 'unknown';
          return formatToolResult({
            summary: `Job ${args.job_id} status: ${status}.`,
            data: response.data,
            meta: response.meta,
            requestId: response.requestId,
          });
        }

        if (!args.list_id) {
          return formatToolError(
            new Error(
              'list_id is required to push. Call with list_integrations=true first to discover integrations, then pass list_id + integration_id.',
            ),
          );
        }
        if (!args.integration_id) {
          return formatToolError(
            new Error(
              'integration_id is required. Call with list_integrations=true to see available integration ids.',
            ),
          );
        }

        const response = await client.call<{ job_id?: string }>({
          method: 'POST',
          path: `/api/v1/lists/${encodeURIComponent(args.list_id)}/push`,
          body: { integration_id: args.integration_id },
        });
        const jobId = (response.data as { job_id?: string })?.job_id;
        return formatToolResult({
          summary: jobId
            ? `Push started. Job id: ${jobId}.`
            : 'Push started.',
          nextStep: jobId
            ? `Poll status with this tool and job_id: "${jobId}".`
            : undefined,
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
