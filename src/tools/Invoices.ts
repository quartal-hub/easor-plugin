import { pageInfo } from "./easor/paging.ts";
import { salesGet, salesRequest } from "./easor/client.ts";
import { fetchProduct } from "./Products.ts";
import { activeSalesAccounts } from "./SalesAccounts.ts";
import type { SalesAccount } from "./model/account.ts";
import type {
  CreateInvoiceInput,
  DeletedInvoice,
  DeliverInvoiceInput,
  InvoiceDelivery,
  InvoiceDetail,
  InvoiceIdInput,
  InvoiceLine,
  InvoiceList,
  InvoiceSummary,
  ListInvoicesInput,
  NewInvoiceLine,
} from "./model/invoice.ts";

/** The general Finnish VAT rate. */
const DEFAULT_TAX_PERCENT = 25.5;

/** A line item of the API's invoice object. */
interface ApiLineItem {
  type?: string;
  productNumber?: string;
  productName?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  taxPercent?: number;
  salesAccountNumber?: number;
  position?: number;
  totalWithoutTax?: number;
  total?: number;
}

/**
 * The parts of the API's invoice object that the tools use. Updates send the whole object back,
 * so it keeps every other field too.
 */
interface ApiInvoice {
  id: string;
  number?: number;
  type?: string;
  status?: string;
  date?: string;
  dueDate?: string;
  paymentTerm?: number;
  referenceNumber?: string;
  shipMode?: string;
  ourReference?: string;
  yourReference?: string;
  orderNumber?: string;
  message?: string;
  currency?: string;
  currencyTotal?: number;
  currencyTotalTax?: number;
  currencyTotalWithoutTax?: number;
  recipientContact?: { name?: string; businessId?: string };
  lineItems?: ApiLineItem[];
  [field: string]: unknown;
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
function text(value: string | null | undefined): string | undefined {
  return value || undefined;
}

/** Adds days to a `YYYY-MM-DD` date. */
function addDays(date: string, days: number): string {
  const result = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
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

function detail(invoice: ApiInvoice): InvoiceDetail {
  return {
    ...summarize(invoice),
    paymentTermDays: invoice.paymentTerm,
    shipMode: text(invoice.shipMode),
    ourReference: text(invoice.ourReference),
    yourReference: text(invoice.yourReference),
    orderNumber: text(invoice.orderNumber),
    message: text(invoice.message),
    totalTax: invoice.currencyTotalTax,
    lines: [...(invoice.lineItems ?? [])]
      // Product lines in their order, then the texts Easor adds, such as VAT exemption notes.
      .sort(
        (a, b) => Number(a.type !== "Product") - Number(b.type !== "Product") || (a.position ?? 0) - (b.position ?? 0),
      )
      .map((line): InvoiceLine => ({
        type: text(line.type),
        productName: text(line.productName),
        description: text(line.description),
        quantity: line.quantity,
        unit: text(line.unit),
        pricePerUnit: line.pricePerUnit,
        taxPercent: line.taxPercent,
        salesAccountNumber: line.salesAccountNumber,
        totalWithoutTax: line.totalWithoutTax,
        total: line.total,
      })),
  };
}

async function fetchInvoice(id: string): Promise<ApiInvoice> {
  const response = await salesGet<ApiInvoiceResponse>("/invoices", { invoiceId: id });
  const invoice = response.invoices?.find((candidate) => candidate.id === id);
  if (!invoice) throw new Error(`No invoice with id ${id}.`);
  return invoice;
}

/**
 * Picks the sales account of a line: the given one if it has the line's VAT percentage, otherwise
 * the only active account with that percentage.
 */
function salesAccountFor(line: NewInvoiceLine, taxPercent: number, accounts: SalesAccount[]): number {
  const matching = accounts.filter((account) => account.vatPercent === taxPercent);
  if (line.salesAccountNumber !== undefined) {
    if (!matching.some((account) => account.number === line.salesAccountNumber)) {
      throw new Error(
        `Line "${line.productName}": sales account ${line.salesAccountNumber} has no active ${taxPercent}% VAT rate. ` +
          "Use listSalesAccounts to see the active accounts.",
      );
    }
    return line.salesAccountNumber;
  }
  const numbers = [...new Set(matching.map((account) => account.number))];
  if (numbers.length === 1) return numbers[0];
  if (numbers.length === 0) {
    throw new Error(
      `Line "${line.productName}": no active sales account has ${taxPercent}% VAT. ` +
        "Use listSalesAccounts to see the active accounts and their VAT percentages.",
    );
  }
  throw new Error(
    `Line "${line.productName}": several sales accounts have ${taxPercent}% VAT (${numbers.join(", ")}); ` +
      "choose one with salesAccountNumber. Use listSalesAccounts to see their names.",
  );
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

  /**
   * Get a sales invoice with its lines.
   * @param input - The invoice id.
   * @returns The invoice.
   * @readOnly
   */
  static async get(input: InvoiceIdInput): Promise<InvoiceDetail> {
    return detail(await fetchInvoice(input.id));
  }

  /**
   * Create a draft sales invoice for an existing customer. The draft is dated today and is not
   * sent: review it, then send it with `deliverInvoice` or remove it with `deleteInvoice`.
   * @param input - The customer, lines and details of the invoice.
   * @returns The draft invoice.
   */
  static async create(input: CreateInvoiceInput): Promise<InvoiceDetail> {
    if (input.lines.length === 0) throw new Error("An invoice needs at least one line.");
    const accounts = await activeSalesAccounts();
    const lineItems = await Promise.all(
      input.lines.map(async (given, index): Promise<ApiLineItem> => {
        const product = given.productId ? await fetchProduct(given.productId) : undefined;
        // The product's values, overridden by the ones given.
        const line: NewInvoiceLine = {
          productName: product?.name,
          description: product?.description,
          unit: product?.unit,
          pricePerUnit: product?.pricePerUnit,
          taxPercent: product?.vatPercent,
          salesAccountNumber: product?.salesAccountNumber,
          ...Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined)),
        } as NewInvoiceLine;
        if (!line.productName) throw new Error(`Line ${index + 1} needs a productName or a productId.`);
        if (line.pricePerUnit === undefined) {
          throw new Error(`Line "${line.productName}" needs a pricePerUnit or a productId.`);
        }
        const taxPercent = line.taxPercent ?? DEFAULT_TAX_PERCENT;
        return {
          type: "Product",
          productNumber: product?.number,
          productName: line.productName,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          pricePerUnit: line.pricePerUnit,
          taxPercent,
          salesAccountNumber: salesAccountFor(line, taxPercent, accounts),
          position: index + 1,
        };
      }),
    );

    const draft = await salesRequest<ApiInvoice>("POST", "/invoices", { query: { contactId: input.contactId } });
    const update: ApiInvoice = { ...draft, lineItems };
    if (input.paymentTermDays !== undefined && draft.date) {
      // The API requires the due date to match the payment term.
      update.paymentTerm = input.paymentTermDays;
      update.dueDate = addDays(draft.date, input.paymentTermDays);
    }
    if (input.ourReference !== undefined) update.ourReference = input.ourReference;
    if (input.yourReference !== undefined) update.yourReference = input.yourReference;
    if (input.orderNumber !== undefined) update.orderNumber = input.orderNumber;
    if (input.message !== undefined) update.message = input.message;
    try {
      return detail(await salesRequest<ApiInvoice>("PUT", `/invoices/${draft.id}`, { body: update }));
    } catch (error) {
      // Don't leave an empty draft behind.
      await salesRequest("DELETE", `/invoices/${draft.id}`).catch(() => undefined);
      throw new Error(`Easor rejected the invoice details, so no invoice was created. ${(error as Error).message}`);
    }
  }

  /**
   * Delete a sales invoice. Only possible before its delivery has started, so in practice for
   * drafts.
   * @param input - The invoice id.
   * @returns The id of the deleted invoice.
   * @destructive
   */
  static async delete(input: InvoiceIdInput): Promise<DeletedInvoice> {
    await salesRequest("DELETE", `/invoices/${input.id}`);
    return { id: input.id, deleted: true };
  }

  /**
   * Send a draft invoice to the customer. This finalizes the invoice: it gets its number, can no
   * longer be deleted, and the delivery method cannot be changed. Always confirm with the user first.
   * @param input - The invoice id and the delivery method.
   * @returns The invoice's number, status and delivery method.
   * @destructive
   * @rest POST {id}/deliver
   */
  static async deliverInvoice(input: DeliverInvoiceInput): Promise<InvoiceDelivery> {
    const result = await salesRequest<ApiInvoice>("POST", `/invoices/${input.id}/deliver`, {
      body: { shipMode: input.shipMode },
    });
    return {
      id: result.id,
      number: result.number || undefined,
      status: result.status,
      shipMode: text(result.shipMode),
      referenceNumber: text(result.referenceNumber),
    };
  }
}
