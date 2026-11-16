import { pageInfo } from "./easor/paging.ts";
import { salesGet } from "./easor/client.ts";
import type { InvoiceList, InvoiceSummary, ListInvoicesInput } from "./model/invoice.ts";

/** The parts of the API's invoice object that the summaries use. */
interface ApiInvoice {
  id: string;
  number?: number;
  type?: string;
  status?: string;
  date?: string;
  dueDate?: string;
  referenceNumber?: string;
  currency?: string;
  currencyTotal?: number;
  currencyTotalWithoutTax?: number;
  recipientContact?: { name?: string; businessId?: string };
}

/** The API's response to an invoice search. */
interface ApiInvoiceResponse {
  invoices?: ApiInvoice[];
  totalCount?: number;
  totalcount?: number;
  total?: number;
  totalTax?: number;
  totalWithoutTax?: number;
}

/** Keeps only the date part of an ISO date-time. */
function dateOnly(value: string | undefined): string | undefined {
  return value?.slice(0, 10);
}

/** Treats the API's empty strings as missing values. */
function text(value: string | undefined): string | undefined {
  return value || undefined;
}

function summarize(invoice: ApiInvoice): InvoiceSummary {
  return {
    id: invoice.id,
    // Drafts have number 0 until they are sent.
    number: invoice.number || undefined,
    type: invoice.type,
    status: invoice.status,
    date: dateOnly(invoice.date),
    dueDate: dateOnly(invoice.dueDate),
    customerName: text(invoice.recipientContact?.name),
    customerBusinessId: text(invoice.recipientContact?.businessId),
    currency: invoice.currency,
    total: invoice.currencyTotal,
    totalWithoutTax: invoice.currencyTotalWithoutTax,
    referenceNumber: text(invoice.referenceNumber),
  };
}

/** Sales invoices in Easor. */
export class Invoices {
  /**
   * List sales invoices, optionally filtered by a date range, status or customer. Returns one page
   * of invoice summaries, by default the 50 oldest by invoice date. When `hasMore` is true the page
   * is incomplete: fetch the rest with `offset` set to `nextOffset` before answering questions about
   * all matching invoices. The sums cover all matching invoices, not just the page.
   * @param input - The filters, sorting and paging.
   * @returns A page of invoice summaries with the totals of all matching invoices.
   * @readOnly
   */
  static async list(input: ListInvoicesInput): Promise<InvoiceList> {
    const offset = input.offset ?? 0;
    const response = await salesGet<ApiInvoiceResponse>("/invoices", {
      dateType: input.dateType,
      dateStart: input.dateFrom,
      // Created, updated, sent and paid dates have a time; include the whole last day.
      dateEnd: input.dateTo && `${input.dateTo}T23:59:59.999`,
      invoiceStatus: input.status,
      contactId: input.contactId,
      invoiceNumber: input.invoiceNumber,
      sortType: input.sortBy,
      sortDirect: input.descending === undefined ? undefined : input.descending ? "Desc" : "Asc",
      offset,
      limit: input.limit ?? 50,
    });
    return {
      invoices: (response.invoices ?? []).map(summarize),
      ...pageInfo(offset, response.invoices?.length ?? 0, response.totalCount ?? response.totalcount),
      total: response.total,
      totalTax: response.totalTax,
      totalWithoutTax: response.totalWithoutTax,
    };
  }
}
