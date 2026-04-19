import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeadTaleClient } from '../client.js';
import { formatToolError, formatToolResult } from './format.js';

const RevealType = z.enum(['email', 'phone', 'both']).describe(
  'What to reveal: "email" for email only, "phone" for phone only, "both" for email + phone.',
);

const ContactIdsSchema = z.object({
  mode: z.literal('contact_ids'),
  contact_ids: z
    .array(z.string())
    .min(1)
    .max(100)
    .describe('Contact ids to reveal. Get these from find_leads.'),
  type: RevealType,
});

const ListIdSchema = z.object({
  mode: z.literal('list_id'),
  list_id: z.string().describe('List id to reveal contacts from. Get this from manage_list.'),
  type: RevealType,
});

const InputSchema = z.discriminatedUnion('mode', [ContactIdsSchema, ListIdSchema]);

export function registerEnrichContacts(server: McpServer, client: LeadTaleClient) {
  server.registerTool(
    'enrich_contacts',
    {
      title: 'Enrich (reveal) contacts',
      description:
        'Reveal email and/or phone for contacts. This tool consumes credits: 1 credit per email reveal, 1 per phone reveal. Accepts either an array of contact ids (from find_leads) or a list id (from manage_list).',
      inputSchema: InputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      try {
        if (args.mode === 'contact_ids') {
          if (args.contact_ids.length === 1) {
            const response = await client.call<unknown>({
              method: 'POST',
              path: `/api/v1/contacts/${encodeURIComponent(args.contact_ids[0]!)}/reveal`,
              body: { type: args.type },
            });
            return formatToolResult({
              summary: `Revealed 1 contact (${args.type}).`,
              nextStep: 'Add revealed contacts to a list with `manage_list` (action: "add_contacts") to push them to an integration.',
              data: response.data,
              meta: response.meta,
              requestId: response.requestId,
            });
          }
          const response = await client.call<unknown>({
            method: 'POST',
            path: '/api/v1/contacts/reveal/batch',
            body: { contact_ids: args.contact_ids, type: args.type },
          });
          return formatToolResult({
            summary: `Revealed ${args.contact_ids.length} contacts (${args.type}).`,
            nextStep:
              'Add revealed contacts to a list with `manage_list` (action: "add_contacts") to push them to an integration.',
            data: response.data,
            meta: response.meta,
            requestId: response.requestId,
          });
        }

        // list_id mode — reveal all contacts in the list
        const response = await client.call<unknown>({
          method: 'POST',
          path: `/api/v1/lists/${encodeURIComponent(args.list_id)}/enrich`,
          body: { type: args.type },
        });
        return formatToolResult({
          summary: `Started enrichment of list ${args.list_id} (${args.type}).`,
          nextStep:
            'Call `manage_list` with action: "get" to see updated contacts once the enrichment completes.',
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
