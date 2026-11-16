import { open, seal } from "./sealedToken.ts";

// Short-lived links to an invoice's PDF. The PDF page is opened in a plain browser tab, outside the
// MCP host, so the token stands in for the tool call that created it. The invoice id is encrypted
// inside the token (see sealedToken.ts): nothing is stored, and the id stays out of readable URLs.

/** Path of the page that serves the PDF (src/pages/easor/invoice-pdf.ts) */
export const PDF_PATH = "/easor/invoice-pdf";

/** Lifetime of a PDF token */
const TTL_SECONDS = 10 * 60;

/** `sealedToken` purpose of PDF tokens */
const PURPOSE = "invoice-pdf";

/** What a PDF link shows */
export interface PdfLinkTarget {
  /** The invoice id */
  invoiceId: string;
}

/**
 * A new token for an invoice's PDF
 * @param target The invoice
 */
export function createPdfToken(target: PdfLinkTarget): Promise<string> {
  return seal(PURPOSE, target, TTL_SECONDS);
}

/**
 * The target of a token, or `undefined` when it is invalid or expired. A token works repeatedly
 * until it expires, so reloading the page works.
 * @param token The token from the URL
 */
export function resolvePdfToken(token: string): Promise<PdfLinkTarget | undefined> {
  return open<PdfLinkTarget>(PURPOSE, token);
}
