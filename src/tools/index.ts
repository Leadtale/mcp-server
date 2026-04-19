import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LeadTaleClient } from '../client.js';
import { registerFindLeads } from './find-leads.js';
import { registerSearchCompanies } from './search-companies.js';
import { registerEnrichContacts } from './enrich-contacts.js';
import { registerManageList } from './manage-list.js';
import { registerPushToIntegration } from './push-to-integration.js';
import { registerGetAccount } from './get-account.js';

export function registerAllTools(server: McpServer, client: LeadTaleClient): void {
  registerFindLeads(server, client);
  registerSearchCompanies(server, client);
  registerEnrichContacts(server, client);
  registerManageList(server, client);
  registerPushToIntegration(server, client);
  registerGetAccount(server, client);
}
