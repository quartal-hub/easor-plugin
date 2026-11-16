/** Which date of an invoice a date range filters by. */
export type InvoiceDateType = "Date" | "DueDate" | "PaidDate" | "SentDate" | "CreatedDate" | "UpdatedDate";

/** The status of an invoice. */
export type InvoiceStatus = "Draft" | "Sending" | "Sent" | "Paid" | "Reminded" | "Collecting" | "Due";

/** The field invoices are sorted by. */
export type InvoiceSortField =
  | "InvoiceNumber"
  | "Date"
  | "DueDate"
  | "ContactName"
  | "ShipMode"
  | "InvoiceStatus"
  | "InvoiceTotalSum"
  | "InvoiceUnpaidSum";

/** Filters, sorting and paging for listing sales invoices. */
export interface ListInvoicesInput {
  /**
   * The first day of the date range (inclusive).
   * @format date
   * @example "2026-01-01"
   */
  dateFrom?: string;
  /**
   * The last day of the date range (inclusive).
   * @format date
   * @example "2026-01-31"
   */
  dateTo?: string;
  /** Which date `dateFrom` and `dateTo` apply to. Defaults to the invoice date (`Date`). */
  dateType?: InvoiceDateType;
  /** Only list invoices in this status. Defaults to all statuses. */
  status?: InvoiceStatus;
  /**
   * Only list invoices to this customer (the contact id).
   * @format uuid
   */
  contactId?: string;
  /** Only list the invoice with this invoice number. */
  invoiceNumber?: number;
  /** The field to sort by. Defaults to the invoice date. */
  sortBy?: InvoiceSortField;
  /** Sort in descending order (newest or largest first). Defaults to ascending. */
  descending?: boolean;
  /** How many invoices to skip, for paging. Defaults to 0. */
  offset?: number;
  /** How many invoices to return at most. Defaults to 50. */
  limit?: number;
}

/** A sales invoice, summarized. */
export interface InvoiceSummary {
  /**
   * The invoice id.
   * @format uuid
   */
  id: string;
  /** The invoice number. Drafts have no number yet. */
  number?: number;
  /** The invoice type, such as `Normal` or `Financing`. */
  type?: string;
  /** The invoice status. */
  status?: string;
  /**
   * The invoice date.
   * @format date
   */
  date?: string;
  /**
   * The due date.
   * @format date
   */
  dueDate?: string;
  /** The customer's name. */
  customerName?: string;
  /** The customer's business id (Y-tunnus). */
  customerBusinessId?: string;
  /** The currency code of the amounts, such as `EUR`. */
  currency?: string;
  /** The total including tax. Credit notes have negative totals. */
  total?: number;
  /** The total excluding tax. Credit notes have negative totals. */
  totalWithoutTax?: number;
  /** The reference number for the payment. */
  referenceNumber?: string;
}

/** A page of sales invoices. */
export interface InvoiceList {
  /** The invoices on this page. */
  invoices: InvoiceSummary[];
  /** How many invoices match the filters in total, across all pages. */
  totalCount?: number;
  /** The offset of this page. */
  offset: number;
  /**
   * True when more invoices match than this page has, so the list is incomplete: get the next page
   * with `offset` set to `nextOffset`, or narrow the filters, before drawing conclusions from it.
   */
  hasMore: boolean;
  /** The offset of the next page, when `hasMore` is true. */
  nextOffset?: number;
  /** The total including tax of all matching invoices. */
  total?: number;
  /** The tax of all matching invoices. */
  totalTax?: number;
  /** The total excluding tax of all matching invoices. */
  totalWithoutTax?: number;
}
