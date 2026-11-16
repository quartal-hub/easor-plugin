import { Fragment, type ReactNode } from "react";
import type { InvoiceDetail, InvoiceLine } from "../tools/model/invoice.ts";

/** Readable names of Easor's invoice statuses and delivery methods. */
const LABELS: Record<string, string> = {
  Draft: "Draft",
  Sent: "Sent",
  Paid: "Paid",
  PartiallyPaid: "Partially paid",
  Overdue: "Overdue",
  Credited: "Credited",
  EInvoice: "E-invoice",
  PaperInvoice: "Paper invoice",
  EmailInvoice: "Email invoice",
  SelfDelivery: "Self delivery",
};

/** Bootstrap badge colours of the statuses; others are grey. */
const STATUS_BADGES: Record<string, string> = {
  Draft: "text-bg-warning",
  Sent: "text-bg-primary",
  Paid: "text-bg-success",
  PartiallyPaid: "text-bg-info",
  Overdue: "text-bg-danger",
};

/** Styles Bootstrap does not cover; everything else comes from the skin's Bootstrap classes */
const CSS = `
.q-invoice .num { font-variant-numeric: tabular-nums; }
@media print {
  .q-invoice tr { break-inside: avoid; }
  .q-invoice .bg-body-tertiary { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
`;

function label(value: string): string {
  return LABELS[value] ?? value;
}

/** The VAT of product lines, summed per VAT percentage, highest first. */
function vatBreakdown(lines: InvoiceLine[]): { percent: number; base: number; tax: number }[] {
  const byPercent = new Map<number, { base: number; tax: number }>();
  for (const line of lines) {
    if (line.taxPercent === undefined || line.totalWithoutTax === undefined) continue;
    const entry = byPercent.get(line.taxPercent) ?? { base: 0, tax: 0 };
    entry.base += line.totalWithoutTax;
    entry.tax += (line.total ?? line.totalWithoutTax) - line.totalWithoutTax;
    byPercent.set(line.taxPercent, entry);
  }
  return [...byPercent].sort(([a], [b]) => b - a).map(([percent, sums]) => ({ percent, ...sums }));
}

/**
 * A sales invoice as a document: header, customer and terms, lines, VAT breakdown and payment
 * details. Presentational only; styled with Bootstrap classes from the skin.
 */
export default function InvoiceDocument(props: {
  invoice: InvoiceDetail;
  /** Buttons shown above the invoice (not printed) */
  actions?: ReactNode;
}) {
  const invoice = props.invoice;
  const currency = invoice.currency ?? "EUR";
  const money = (amount: number | undefined) =>
    amount === undefined ? "" : new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  const number = (value: number | undefined) =>
    value === undefined ? "" : new Intl.NumberFormat("en-GB", { maximumFractionDigits: 4 }).format(value);
  const date = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${iso.slice(0, 10)}T00:00:00Z`),
    );

  const products = invoice.lines.filter((line) => line.type === "Product" || line.type === undefined);
  // Texts Easor adds to the invoice, such as VAT exemption notes.
  const notes = invoice.lines.filter((line) => !products.includes(line));
  const vat = vatBreakdown(products);
  const terms: [string, string | undefined][] = [
    ["Invoice date", invoice.date && date(invoice.date)],
    ["Due date", invoice.dueDate && date(invoice.dueDate)],
    ["Payment term", invoice.paymentTermDays !== undefined ? `${invoice.paymentTermDays} days net` : undefined],
    ["Delivery", invoice.shipMode && label(invoice.shipMode)],
    ["Our reference", invoice.ourReference],
    ["Your reference", invoice.yourReference],
    ["Order number", invoice.orderNumber],
  ];
  const payment: [string, string | undefined][] = [
    ["Reference number", invoice.referenceNumber],
    ["Due date", invoice.dueDate && date(invoice.dueDate)],
    ["Amount due", money(invoice.total)],
  ];

  return (
    <div className="q-invoice p-3">
      <style>{CSS}</style>
      {props.actions ? <div className="d-flex flex-wrap align-items-center gap-2 mb-3 d-print-none">{props.actions}</div> : null}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 border-bottom border-2 pb-2 mb-3">
        <div>
          <h1 className="h4 mb-1">
            Invoice {invoice.number ? <span className="num">{invoice.number}</span> : null}
          </h1>
          {invoice.number ? null : <div className="text-body-secondary">Draft, not numbered yet</div>}
        </div>
        {invoice.status ? (
          <span className={`badge ${STATUS_BADGES[invoice.status] ?? "text-bg-secondary"}`}>{label(invoice.status)}</span>
        ) : null}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6">
          <div className="small text-body-secondary">Bill to</div>
          <div className="fw-semibold">{invoice.customerName ?? "Unknown customer"}</div>
          {invoice.customerBusinessId ? <div>Business ID {invoice.customerBusinessId}</div> : null}
        </div>
        <div className="col-sm-6">
          <dl className="row mb-0">
            {terms
              .filter(([, value]) => value)
              .map(([term, value]) => (
                <Fragment key={term}>
                  <dt className="col-6 fw-normal text-body-secondary">{term}</dt>
                  <dd className="col-6 mb-1 num">{value}</dd>
                </Fragment>
              ))}
          </dl>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-sm align-top">
          <thead>
            <tr>
              <th>Product</th>
              <th className="text-end">Qty</th>
              <th className="text-end">Unit price</th>
              <th className="text-end">VAT</th>
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((line, i) => (
              <tr key={i}>
                <td>
                  {line.productName ?? "—"}
                  {line.description ? <div className="small text-body-secondary">{line.description}</div> : null}
                </td>
                <td className="num text-end text-nowrap">
                  {number(line.quantity)}
                  {line.unit ? ` ${line.unit}` : ""}
                </td>
                <td className="num text-end text-nowrap">{money(line.pricePerUnit)}</td>
                <td className="num text-end text-nowrap">
                  {line.taxPercent !== undefined ? `${number(line.taxPercent)} %` : ""}
                </td>
                <td className="num text-end text-nowrap">{money(line.totalWithoutTax)}</td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-body-secondary">
                  No lines on this invoice.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="text-end text-body-secondary">
                Total excl. VAT
              </td>
              <td className="num text-end text-nowrap">{money(invoice.totalWithoutTax)}</td>
            </tr>
            {vat.map((rate) => (
              <tr key={rate.percent}>
                <td colSpan={4} className="text-end text-body-secondary">
                  VAT {number(rate.percent)} % of {money(rate.base)}
                </td>
                <td className="num text-end text-nowrap">{money(rate.tax)}</td>
              </tr>
            ))}
            {vat.length === 0 && invoice.totalTax !== undefined ? (
              <tr>
                <td colSpan={4} className="text-end text-body-secondary">
                  VAT
                </td>
                <td className="num text-end text-nowrap">{money(invoice.totalTax)}</td>
              </tr>
            ) : null}
            <tr className="fw-semibold">
              <td colSpan={4} className="text-end">
                Total
              </td>
              <td className="num text-end text-nowrap">{money(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="row row-cols-1 row-cols-sm-3 g-2 mb-3">
        {payment
          .filter(([, value]) => value)
          .map(([term, value]) => (
            <div className="col" key={term}>
              <div className="bg-body-tertiary rounded p-2 h-100">
                <div className="small text-body-secondary">{term}</div>
                <div className="num fw-semibold">{value}</div>
              </div>
            </div>
          ))}
      </div>

      {invoice.message ? <p className="mb-3" style={{ whiteSpace: "pre-wrap" }}>{invoice.message}</p> : null}

      {notes.length > 0 ? (
        <div className="small text-body-secondary">
          {notes.map((line, i) => (
            <div key={i}>{[line.productName, line.description].filter(Boolean).join(" ")}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
