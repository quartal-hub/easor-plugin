import { useEffect, useRef, useState } from "react";
import { connectWidget, type WidgetBridge } from "@quartal/plugin/widget";
import type { InvoiceDetail, InvoicePdfLink } from "../tools/model/invoice.ts";
import InvoiceDocument from "./InvoiceDocument.tsx";

/**
 * Widget for the `getInvoice` tool: the invoice as a document. MCP hosts run widgets in a sandboxed
 * iframe where downloads and `window.print()` are blocked, so the PDF button asks the plugin for a
 * short-lived link to Easor's PDF and opens it in a browser tab.
 */
export default function InvoiceView() {
  const bridge = useRef<WidgetBridge<InvoiceDetail> | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfState, setPdfState] = useState<"idle" | "opening" | "failed">("idle");

  useEffect(() => {
    void connectWidget<InvoiceDetail>({
      name: "InvoiceApp",
      version: "0.2.0",
      onResult: (result) => {
        setInvoice(result);
        setError(null);
        setPdfState("idle");
      },
      onError: setError,
    }).then((b) => {
      bridge.current = b;
    });
  }, []);

  const openPdf = async () => {
    if (!invoice || !bridge.current) return;
    setPdfState("opening");
    const link = await bridge.current
      .callTool<InvoicePdfLink>("createInvoicePdfLink", { id: invoice.id })
      .catch(() => undefined);
    if (!link) {
      setPdfState("failed");
      return;
    }
    // The tool returns a path; this script is served by the plugin's own server, so its URL is the
    // plugin's base URL in dev and in every deployment.
    const url = new URL(link.path, import.meta.url).href;
    // Fall back to a plain new tab when the host cannot open links (error or rejection).
    const res = await bridge.current.app.openLink({ url }).catch(() => undefined);
    if (!res || res.isError) window.open(url, "_blank", "noopener");
    setPdfState("idle");
  };

  if (error) {
    return (
      <div className="alert alert-danger m-3" role="alert">
        {error}
      </div>
    );
  }
  if (!invoice) return <div className="p-3 text-body-secondary">Loading the invoice…</div>;
  return (
    <InvoiceDocument
      invoice={invoice}
      actions={
        <>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => void openPdf()}
            disabled={pdfState === "opening"}
          >
            <i className="bi bi-file-earmark-pdf me-2" aria-hidden="true" />
            {pdfState === "opening" ? "Opening…" : "Open PDF"}
          </button>
          {pdfState === "failed" ? (
            <span className="small text-danger" role="alert">
              Could not open the invoice PDF.
            </span>
          ) : null}
        </>
      }
    />
  );
}
