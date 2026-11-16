import { useEffect, useState } from "react";
import { connectWidget } from "@quartal/plugin/widget";
import type { InvoiceDetail } from "../tools/model/invoice.ts";
import InvoiceDocument from "./InvoiceDocument.tsx";

/** Widget for the `getInvoice` tool: the invoice as a document. */
export default function InvoiceView() {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void connectWidget<InvoiceDetail>({
      name: "InvoiceApp",
      version: "0.1.0",
      onResult: (result) => {
        setInvoice(result);
        setError(null);
      },
      onError: setError,
    });
  }, []);

  if (error) {
    return (
      <div className="alert alert-danger m-3" role="alert">
        {error}
      </div>
    );
  }
  if (!invoice) return <div className="p-3 text-body-secondary">Loading the invoice…</div>;
  return <InvoiceDocument invoice={invoice} />;
}
