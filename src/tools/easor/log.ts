// One log line per tool call and per PDF link request, for `vercel logs` and the dev server's
// console. Inputs and results are not logged: they hold customers' and invoices' details.
import type { QuartalPluginContext } from "@quartal/plugin";

/** Local time as `22:45:12`, like the timestamps of the Astro dev server's log */
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function log(line: string): void {
  console.info(`${TIME.format(new Date())} ${line}`);
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs a tool and logs one line: its name, the logged-in user's id (`ctx.uid`, the token's
 * `sub`), how long it took and, when it failed, why. The error is thrown on to the caller.
 * @param tool The tool's MCP name, such as `getInvoice`
 * @param ctx The logged-in user, from the access token
 * @param run The tool's work
 */
export async function logToolCall<T>(
  tool: string,
  ctx: QuartalPluginContext | undefined,
  run: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  const prefix = `[tool] ${tool} uid=${ctx?.uid ?? "(none)"}`;
  try {
    const result = await run();
    log(`${prefix} ok ${Date.now() - started}ms`);
    return result;
  } catch (error) {
    log(`${prefix} failed ${Date.now() - started}ms: ${failure(error)}`);
    throw error;
  }
}

/**
 * Logs a request for an invoice PDF through a PDF link.
 * @param outcome `ok`, `expired` (unknown or expired token) or `failed` (Easor's error)
 * @param error Why it failed
 */
export function logPdfRequest(outcome: "ok" | "expired" | "failed", error?: unknown): void {
  log(`[pdf] ${outcome}${error === undefined ? "" : `: ${failure(error)}`}`);
}
