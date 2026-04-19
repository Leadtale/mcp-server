import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeadTaleClient } from '../client.js';
import { formatToolError, formatToolResult } from './format.js';

const InputSchema = z.object({
  include: z
    .array(z.enum(['integrations', 'saved_searches', 'usage']))
    .optional()
    .describe(
      'Which additional sections to fetch. Each extra section is a separate API call. Default: none — just the account summary.',
    ),
});

export function registerGetAccount(server: McpServer, client: LeadTaleClient) {
  server.registerTool(
    'get_account',
    {
      title: 'Get account info',
      description:
        'Return account summary: credit balance, plan, owner, and optionally connected integrations, saved searches, or recent usage. Call this first in a new conversation to know what the account is working with. This tool is free.',
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (args) => {
      try {
        const include = args.include ?? [];
        const [account, integrations, savedSearches, usage] = await Promise.all([
          client.call<unknown>({ method: 'GET', path: '/api/v1/account' }),
          include.includes('integrations')
            ? client.call<unknown>({ method: 'GET', path: '/api/v1/integrations' })
            : null,
          include.includes('saved_searches')
            ? client.call<unknown>({ method: 'GET', path: '/api/v1/saved-searches' })
            : null,
          include.includes('usage')
            ? client.call<unknown>({ method: 'GET', path: '/api/v1/account/usage' })
            : null,
        ]);

        const payload: Record<string, unknown> = { account: account.data };
        if (integrations) payload['integrations'] = integrations.data;
        if (savedSearches) payload['saved_searches'] = savedSearches.data;
        if (usage) payload['usage'] = usage.data;

        const creditsRemaining =
          typeof (account.data as { credits_remaining?: number } | undefined)?.credits_remaining ===
          'number'
            ? (account.data as { credits_remaining: number }).credits_remaining
            : account.meta.credits_remaining;

        const summary =
          creditsRemaining !== undefined
            ? `Account info loaded. ${creditsRemaining} credits remaining.`
            : 'Account info loaded.';

        return formatToolResult({
          summary,
          data: payload,
          meta: account.meta,
          requestId: account.requestId,
        });
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
