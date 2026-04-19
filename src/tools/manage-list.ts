import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeadTaleClient } from '../client.js';
import { formatToolError, formatToolResult } from './format.js';

const CreateSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(1).describe('Human-readable list name.'),
  description: z.string().optional(),
  contact_ids: z
    .array(z.string())
    .optional()
    .describe('Optional initial contacts (from find_leads).'),
});

const AddContactsSchema = z.object({
  action: z.literal('add_contacts'),
  list_id: z.string(),
  contact_ids: z.array(z.string()).min(1),
});

const GetSchema = z.object({
  action: z.literal('get'),
  list_id: z.string(),
  include_contacts: z
    .boolean()
    .optional()
    .describe('When true, include the full contact roster in the response.'),
});

const ListSchema = z.object({
  action: z.literal('list'),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
});

const DeleteSchema = z.object({
  action: z.literal('delete'),
  list_id: z.string(),
});

const InputSchema = z.discriminatedUnion('action', [
  CreateSchema,
  AddContactsSchema,
  GetSchema,
  ListSchema,
  DeleteSchema,
]);

export function registerManageList(server: McpServer, client: LeadTaleClient) {
  server.registerTool(
    'manage_list',
    {
      title: 'Manage contact lists',
      description:
        'Create, list, read, add contacts to, or delete LeadTale contact lists. Pick an action: "create", "list", "get", "add_contacts", or "delete". Lists are used to organize contacts and push them to connected integrations. This tool is free.',
      inputSchema: InputSchema,
    },
    async (args) => {
      try {
        switch (args.action) {
          case 'create': {
            const response = await client.call<{ id?: string }>({
              method: 'POST',
              path: '/api/v1/lists',
              body: {
                name: args.name,
                ...(args.description ? { description: args.description } : {}),
                ...(args.contact_ids ? { contact_ids: args.contact_ids } : {}),
              },
            });
            const listId = (response.data as { id?: string } | undefined)?.id;
            return formatToolResult({
              summary: `Created list "${args.name}"${listId ? ` (id: ${listId})` : ''}.`,
              nextStep:
                'Push the list to an integration with `push_to_integration`, or reveal its contacts with `enrich_contacts`.',
              data: response.data,
              meta: response.meta,
              requestId: response.requestId,
            });
          }
          case 'add_contacts': {
            const response = await client.call<unknown>({
              method: 'POST',
              path: `/api/v1/lists/${encodeURIComponent(args.list_id)}/contacts`,
              body: { contact_ids: args.contact_ids },
            });
            return formatToolResult({
              summary: `Added ${args.contact_ids.length} contacts to list ${args.list_id}.`,
              data: response.data,
              meta: response.meta,
              requestId: response.requestId,
            });
          }
          case 'get': {
            const path = args.include_contacts
              ? `/api/v1/lists/${encodeURIComponent(args.list_id)}/contacts`
              : `/api/v1/lists/${encodeURIComponent(args.list_id)}`;
            const response = await client.call<unknown>({
              method: 'GET',
              path,
            });
            return formatToolResult({
              summary: `Retrieved list ${args.list_id}.`,
              data: response.data,
              meta: response.meta,
              requestId: response.requestId,
            });
          }
          case 'list': {
            const response = await client.call<unknown[]>({
              method: 'GET',
              path: '/api/v1/lists',
              query: {
                ...(args.page ? { page: args.page } : {}),
                ...(args.per_page ? { per_page: args.per_page } : {}),
              },
            });
            const count = Array.isArray(response.data) ? response.data.length : 0;
            const total =
              typeof response.meta['total'] === 'number'
                ? (response.meta['total'] as number)
                : count;
            return formatToolResult({
              summary: `You have ${total} lists (showing ${count} on this page).`,
              data: response.data,
              meta: response.meta,
              requestId: response.requestId,
            });
          }
          case 'delete': {
            const response = await client.call<unknown>({
              method: 'DELETE',
              path: `/api/v1/lists/${encodeURIComponent(args.list_id)}`,
            });
            return formatToolResult({
              summary: `Deleted list ${args.list_id}.`,
              data: response.data,
              meta: response.meta,
              requestId: response.requestId,
            });
          }
        }
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
