// The invoice PDF, opened in a browser tab by the invoice widget's download button (MCP hosts block
// downloads and the print dialog inside widgets). The short-lived, encrypted `token` from
// createInvoicePdfLink carries the invoice id. The PDF comes from Easor on every request, as Easor
// produces it for the customer; the browser's PDF viewer then prints or saves it.
import type { APIRoute } from "astro";
import { salesDownload } from "../../tools/easor/client.ts";
import { logPdfRequest } from "../../tools/easor/log.ts";
import { resolvePdfToken } from "../../tools/easor/pdfLinks.ts";

export const prerender = false;

/** Headers of every response: the token must not be cached or leak to other sites. */
const PRIVATE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };

function message(status: number, text: string): Response {
  return new Response(text, { status, headers: { ...PRIVATE, "Content-Type": "text/plain; charset=utf-8" } });
}

export const GET: APIRoute = async ({ url }) => {
  const target = await resolvePdfToken(url.searchParams.get("token") ?? "");
  if (!target) {
    logPdfRequest("expired");
    return message(404, "This PDF link is unknown or has expired (links work for 10 minutes). Use the button in the chat again.");
  }
  let pdf: Response;
  try {
    pdf = await salesDownload(`/invoices/${encodeURIComponent(target.invoiceId)}/download`, "application/pdf");
  } catch (error) {
    logPdfRequest("failed", error);
    return message(502, `Could not get the invoice PDF from Easor. ${(error as Error).message}`);
  }
  // Easor names the file (Lasku_<customer>_<number>.pdf) as an attachment; show it in the browser
  // instead, so it can be read and printed there, keeping the name for saving.
  logPdfRequest("ok");
  const disposition = (pdf.headers.get("Content-Disposition") ?? "attachment").replace(/^\s*attachment/i, "inline");
  return new Response(pdf.body, {
    headers: { ...PRIVATE, "Content-Type": "application/pdf", "Content-Disposition": disposition },
  });
};
