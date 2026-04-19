#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'node:module';
import { LeadTaleClient } from './client.js';
import { registerAllTools } from './tools/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { name: string; version: string };

function main() {
  const apiKey = process.env['LEADTALE_API_KEY'];
  if (!apiKey) {
    console.error(
      'Error: LEADTALE_API_KEY is not set.\n\n' +
        'Generate an API key at LeadTale → Settings → Developer → API Keys,\n' +
        'then add it to your MCP client config under `env.LEADTALE_API_KEY`.\n',
    );
    process.exit(1);
  }

  const baseUrl = process.env['LEADTALE_API_BASE'];

  const client = new LeadTaleClient({
    apiKey,
    baseUrl,
    version: pkg.version,
  });

  const server = new McpServer(
    { name: pkg.name, version: pkg.version },
    {
      instructions:
        'Use these tools to search LeadTale contacts and companies, reveal contact info (email/phone), manage contact lists, and push them to connected integrations. Call `get_account` first if you need the user\'s credit balance or plan info. Reveals consume credits — every tool result shows credits used and remaining.',
    },
  );

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  server.connect(transport).then(
    () => {
      console.error(`${pkg.name} ${pkg.version} running on stdio.`);
    },
    (err: unknown) => {
      console.error('Fatal: failed to start MCP server.', err);
      process.exit(1);
    },
  );
}

main();
