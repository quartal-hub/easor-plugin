# Hosting on Vercel

How to run the plugin on [Vercel](https://vercel.com), so that hosted MCP clients (claude.ai,
Claude Desktop, ChatGPT) can reach it.

## What you need

- A **Vercel account**. The plugin runs as one Vercel Function (Fluid compute, Vercel's default
  for new projects).
- The **Easor Sales API credentials** from Easor integration support (see `.env.example`).
- Users log in through the Quartal test Keycloak (`auth: "quartal-hub"`), and each MCP client
  needs a Keycloak client: [authentication.md](authentication.md).

No database is needed: the plugin keeps nothing between requests.

| Data | Where |
|---|---|
| Easor credentials | environment variables |
| Easor access token | the function's memory, as a cache; a new instance fetches its own |
| Invoice PDF links (10 minutes) | nowhere: an encrypted token inside the link, valid on any instance |

## Steps

1. **Create the project and deploy.** Either import the Git repository in the Vercel dashboard,
   or deploy this folder with the CLI:

   ```bash
   npx vercel link              # create or pick the project
   npx vercel deploy --prod
   ```

   Vercel detects Astro and sets `VERCEL=1` when it builds, which selects `@astrojs/vercel` in
   `astro.config.mjs`; everywhere else the plugin stays a standalone Node.js server.
   `vercel.json` asks for the Frankfurt region (`fra1`), close to Talenom's API in Finland. The
   CLI uploads the folder as the deployment's source and doesn't read `.gitignore`;
   `.vercelignore` keeps `.env` and build output out of the upload.

   The first deploy gives the production domain, e.g. `https://<project>.vercel.app`.

2. **Set the environment variables** for Production (Settings → Environment Variables, or
   `npx vercel env add`):

   | Variable | Value |
   |---|---|
   | `EASOR_SALES_CLIENT_ID` | the Easor API client id |
   | `EASOR_SALES_CLIENT_SECRET` | the client secret; mark it Sensitive. It is also the key of the PDF links |
   | `EASOR_SALES_SUBSCRIPTION_KEY` | the APIM subscription key; mark it Sensitive |
   | `EASOR_ORGANIZATION_NUMBER` | the Easor customer number whose invoices the tools use |
   | `EASOR_SCOPE` | optional: only if the default Easor B2B scope doesn't fit |

   Deploy again afterwards: variables take effect in new deployments only.

3. **Use the production domain.** Vercel's standard Deployment Protection puts a Vercel login in
   front of the per-deployment URLs but not the production domain. MCP clients can't get past that
   login, so connect them to `https://<your domain>/mcp`.

4. **Allow the MCP clients in Keycloak:** add their OAuth redirect URIs to the Keycloak client,
   e.g. `https://claude.ai/api/mcp/auth_callback` for claude.ai
   ([authentication.md](authentication.md)).

## Checks

- `https://<your domain>/plugin.json` and `/.well-known/oauth-protected-resource` answer `200`,
  and `POST /mcp` without a token answers `401`.
- In an MCP client (e.g. MCPJam, see [authentication.md](authentication.md)): log in, run
  `listInvoices`, open an invoice with `getInvoice` and try its Open PDF button.
- Logs: `npx vercel logs --since 1h`.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Tools fail with "The EASOR_… environment variable is not set" | The variable is missing for Production, or the deployment predates it: set it and deploy again. |
| Easor token or API calls fail with `401`/`403` | Wrong credentials or subscription key, or Talenom restricts access by IP address: Vercel's outgoing IPs change unless the project uses Static IPs. |
| MCP clients get an HTML login page instead of `401` | They use a per-deployment URL behind Deployment Protection; use the production domain. |
| The Open PDF link says it is unknown or has expired | The link is older than 10 minutes, or `EASOR_SALES_CLIENT_SECRET` changed since it was made. |
