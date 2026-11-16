# Easor Plugin

Sales invoicing for AI agents through Easor (Talenom): an agent lists and
reads sales invoices, creates draft invoices for customers and products in Easor, and sends them.
Built with [Quartal Plugins](https://plugin.quartal.com), so the same tools are served over MCP
(with an MCP Apps widget) and as a REST API.

## Tools

| Tool | REST | What it does |
|---|---|---|
| `listInvoices` | `GET /api/invoices` | Sales invoices, filtered by date range, status, customer or number; sorted and paged (50 by default), with the totals of all matching invoices. |
| `getInvoice` | `GET /api/invoices/{id}` | An invoice with its lines. Has the **invoice widget**. |
| `createInvoice` | `POST /api/invoices` | A **draft** invoice dated today for an existing customer. A line can take its name, price, unit, VAT and sales account from a product (`productId`), or give them itself. |
| `deliverInvoice` | `POST /api/invoices/{id}/deliver` | **Sends** a draft to the customer (e-invoice, email, paper or self-delivery). This finalizes it: it gets its number and can no longer be deleted. |
| `deleteInvoice` | `DELETE /api/invoices/{id}` | Deletes an invoice whose delivery hasn't started, in practice a draft. |
| `findContacts` | `GET /api/contacts` | Customers by name, business id or other text, e.g. for the `contactId` of an invoice. |
| `createContact` | `POST /api/contacts` | A new customer, a business (with its business id or VAT number) or a person. |
| `findProducts` | `GET /api/products` | Products and services by name or number, with their prices. |
| `listSalesAccounts` | `GET /api/sales-accounts` | The active sales accounts and their VAT percentages, which invoice lines must match. |
| `createInvoicePdfLink` | `POST /api/invoices/invoice-pdf-link` | Widget only (`@visibility app`): a link to the invoice's PDF. |

The `find`/`list`/`get` tools and `createInvoicePdfLink` are read-only, and `deliverInvoice` and
`deleteInvoice` are marked destructive, so MCP hosts can ask the user before running them. `deliverInvoice`'s
description tells the agent to confirm with the user first.

### Invoice widget

`getInvoice` shows the invoice as a document (`src/pages/widgets/getInvoice.astro`,
`src/components/InvoiceView.tsx`). MCP hosts run widgets in a sandbox that blocks downloads and
the print dialog, so its **Open PDF** button calls `createInvoicePdfLink` and opens the returned
link in a browser tab: `/easor/invoice-pdf?token=…` fetches the PDF from Easor, as Easor makes it
for the customer. The token is encrypted (keyed by `EASOR_SALES_CLIENT_SECRET`), holds the invoice
id and works for 10 minutes; the server stores nothing.

## Setup

Requirements: Node.js 22.23.4 or later, pnpm 11 (pinned in `package.json`).

1. **Get API credentials** for the Easor (Talenom) Sales Invoicing [FI] API from Easor
   integration support: a client id and secret, and an API subscription key.
2. **Configure:** copy `.env.example` to `.env` (gitignored) and set
   - `EASOR_SALES_CLIENT_ID`, `EASOR_SALES_CLIENT_SECRET`, `EASOR_SALES_SUBSCRIPTION_KEY`: the credentials,
   - `EASOR_ORGANIZATION_NUMBER`: the Easor customer number of the organization whose invoices the
     tools use,
   - `EASOR_SCOPE`: only if the default OAuth scope doesn't fit.

   The server starts without them, but every tool then fails and names the missing variable.
3. **Run:**

   ```bash
   pnpm install
   pnpm dev
   ```

The plugin runs on <http://localhost:4321>:

| URL | What |
|---|---|
| `/` | Documentation site, with testers for the tools and the widget |
| `/mcp` | The MCP server: connect any MCP client here |
| `/api/...` | The REST API (see [Tools](#tools)); the OpenAPI document is `/open-api.json` |
| `/plugin.json` | The Agent Plugins manifest (`/plugin.zip` is the installable package) |
| `/widgets/getInvoice` | The invoice widget |
| `/easor/invoice-pdf?token=…` | An invoice PDF, through a link from `createInvoicePdfLink` |

### Logging in

`/mcp` and `/api/*` need an OAuth token from the Quartal test Keycloak (`auth: "quartal-hub"` in
`qrtl.config.ts`). MCP clients run the login themselves, with a pre-registered Keycloak client:
[docs/authentication.md](docs/authentication.md).

## Build and deploy

```bash
pnpm build
node ./dist/server/entry.mjs
```

`pnpm build` also checks the tools' types and fails on schema problems. The server logs one line
per tool call, with the user's id, the duration and any error (`src/tools/easor/log.ts`). One way
to host it: [docs/hosting-on-vercel.md](docs/hosting-on-vercel.md).

## Code

| Path | What |
|---|---|
| `src/tools/` | The tool classes (`Invoices`, `Contacts`, `Products`, `SalesAccounts`), exported from `mod.ts` |
| `src/tools/model/` | The tools' input and output types; their JSDoc becomes the schemas |
| `src/tools/easor/` | The Easor API client (token, requests, errors), paging, PDF link tokens, logging |
| `src/pages/widgets/`, `src/components/` | The invoice widget |
| `src/pages/easor/invoice-pdf.ts` | The PDF route |
| `qrtl.config.ts` | Plugin title, description, auth, style and widget CSP |

Conventions for changing the tools are in [AGENTS.md](AGENTS.md); the framework is documented at
<https://plugin.quartal.com>.

## Limitations

- **One Easor organization, shared by all users.** The plugin calls Easor with its own credentials
  for `EASOR_ORGANIZATION_NUMBER`. The login decides only who may use the tools: everyone who can
  log in sees and can send that organization's invoices.
- **Sending is real.** `deliverInvoice` sends the invoice to the customer; it cannot be undone or
  deleted afterwards.
- **Test login.** Users log in at the Quartal *test* Keycloak.
- Invoice lines use the general Finnish VAT rate (25.5 %) unless the line or its product says
  otherwise.
