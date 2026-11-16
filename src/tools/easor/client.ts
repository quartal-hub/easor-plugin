// Client for the Easor (Talenom) Sales Invoicing [FI] API:
// https://apimportal.talenom.com/api-details#api=sales-api-fi
// Authentication is an OAuth2 client-credentials token plus an APIM subscription key.

const TOKEN_URL = "https://id.talenom.com/api/b2b/oauth2/v1.0/token";
const SALES_API_URL = "https://apim.talenom.com/fi/sales/v1";
const DEFAULT_SCOPE =
  "https://a130f42fd1364b098106e8dc11.onmicrosoft.com/8567253a-b2a6-4f21-b52c-689b068c0810/.default";
// The gateway rejects default library user agents.
const USER_AGENT = "Easor-API-Client/1.0";
const TIMEOUT_MS = 30_000;

interface Config {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  scope: string;
  organizationNumber: string;
}

let envFileLoaded = false;

function env(name: string): string | undefined {
  if (!envFileLoaded) {
    envFileLoaded = true;
    try {
      // Fills in variables from .env without overriding ones already set.
      process.loadEnvFile();
    } catch {
      // No .env file: rely on the environment.
    }
  }
  return process.env[name] || undefined;
}

function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`The ${name} environment variable is not set.`);
  return value;
}

function config(): Config {
  return {
    clientId: requireEnv("EASOR_SALES_CLIENT_ID"),
    clientSecret: requireEnv("EASOR_SALES_CLIENT_SECRET"),
    subscriptionKey: requireEnv("EASOR_SALES_SUBSCRIPTION_KEY"),
    scope: env("EASOR_SCOPE") ?? DEFAULT_SCOPE,
    organizationNumber: requireEnv("EASOR_ORGANIZATION_NUMBER"),
  };
}

let cachedToken: { value: string; expiresAt: number } | undefined;

async function accessToken(cfg: Config): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: cfg.scope,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Easor authentication failed with HTTP ${response.status}.`);
  }
  const body = (await response.json()) as { access_token: string; expires_in?: number };
  // Renew a minute before the token expires.
  const lifetimeSeconds = Number(body.expires_in ?? 300);
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (lifetimeSeconds - 60) * 1000 };
  return body.access_token;
}

/** Problem details returned by the API on errors. */
interface ProblemDetails {
  title?: string;
  detail?: string;
}

/**
 * Calls a GET operation of the Sales Invoicing API for the configured organization.
 * @param path - The path after `/{organizationNumber}`, such as `/invoices`.
 * @param query - Query parameters; undefined values are left out.
 */
export async function salesGet<T>(
  path: string,
  query: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const cfg = config();
  const url = new URL(`${SALES_API_URL}/${encodeURIComponent(cfg.organizationNumber)}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await accessToken(cfg)}`,
      "Ocp-Apim-Subscription-Key": cfg.subscriptionKey,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    if (response.status === 401) cachedToken = undefined;
    let problem: ProblemDetails = {};
    try {
      problem = (await response.json()) as ProblemDetails;
    } catch {
      // Not JSON.
    }
    const reason = [problem.title, problem.detail].filter(Boolean).join(": ");
    throw new Error(`Easor API request failed with HTTP ${response.status}${reason ? `: ${reason}` : "."}`);
  }
  return (await response.json()) as T;
}
