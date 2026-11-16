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

/** How an invoice is delivered to the customer. */
export type ShipMode = "EInvoice" | "PaperInvoice" | "EmailInvoice" | "SelfDelivery";

/**
 * A line of a new invoice: either a product from the product register (`productId`) or a free-form
 * line (`productName` and `pricePerUnit`). Values given here override the product's own.
 */
export interface NewInvoiceLine {
  /**
   * A product from the register (see `findProducts`). Its name, price, unit, VAT percentage and
   * sales account are used unless given here.
   * @format uuid
   */
  productId?: string;
  /** The name of the product or service. Required without `productId`. */
  productName?: string;
  /** A longer description of the line. */
  description?: string;
  /**
   * The quantity.
   * @example 2
   */
  quantity: number;
  /** The unit, such as `kpl`, `h` or `kg`. */
  unit?: string;
  /**
   * The price of one unit, excluding tax. Required without `productId`.
   * @example 100
   */
  pricePerUnit?: number;
  /**
   * The VAT percentage. Defaults to the product's, or else the general Finnish rate, 25.5. It must
   * match an active sales account (see `listSalesAccounts`).
   * @example 25.5
   */
  taxPercent?: number;
  /**
   * The sales account number. Defaults to the product's, or else the active sales account with the
   * line's VAT percentage; required when several accounts have it, as with 0% VAT.
   * @example 3000
   */
  salesAccountNumber?: number;
}

/** A new sales invoice. */
export interface CreateInvoiceInput {
  /**
   * The customer: the id of a contact (see `findContacts`, or `createContact` for a new customer).
   * @format uuid
   */
  contactId: string;
  /** The invoice lines; at least one. */
  lines: NewInvoiceLine[];
  /** Days until the invoice is due. Defaults to the organization's payment term. */
  paymentTermDays?: number;
  /** Our reference, such as the salesperson's name. */
  ourReference?: string;
  /** The customer's reference. */
  yourReference?: string;
  /** The customer's order number. */
  orderNumber?: string;
  /** A message to the customer, printed on the invoice. */
  message?: string;
}

/** A line of an invoice. */
export interface InvoiceLine {
  /**
   * `Product` for a product or service line. Other types, such as `LawText`, are texts Easor adds by
   * itself, like the legal note required for 0% VAT sales; their text is in `description`.
   */
  type?: string;
  /** The name of the product or service. */
  productName?: string;
  /** A longer description of the line. */
  description?: string;
  /** The quantity. */
  quantity?: number;
  /** The unit. */
  unit?: string;
  /** The price of one unit, excluding tax. */
  pricePerUnit?: number;
  /** The VAT percentage. */
  taxPercent?: number;
  /** The sales account number. */
  salesAccountNumber?: number;
  /** The line total excluding tax. */
  totalWithoutTax?: number;
  /** The line total including tax. */
  total?: number;
}

/** A sales invoice with its lines. */
export interface InvoiceDetail extends InvoiceSummary {
  /** Days until the invoice is due. */
  paymentTermDays?: number;
  /** How the invoice is or will be delivered. */
  shipMode?: string;
  /** Our reference. */
  ourReference?: string;
  /** The customer's reference. */
  yourReference?: string;
  /** The customer's order number. */
  orderNumber?: string;
  /** The message to the customer. */
  message?: string;
  /** The tax total. */
  totalTax?: number;
  /** The invoice lines. */
  lines: InvoiceLine[];
}

/** Identifies an invoice. */
export interface InvoiceIdInput {
  /**
   * The invoice id.
   * @format uuid
   */
  id: string;
}

/** Which invoice to deliver, and how. */
export interface DeliverInvoiceInput {
  /**
   * The invoice id.
   * @format uuid
   */
  id: string;
  /**
   * How to deliver the invoice. This can be chosen only once per invoice. `EInvoice`, `PaperInvoice`
   * and `EmailInvoice` send the invoice to the customer; `SelfDelivery` only finalizes it, for
   * delivering it yourself.
   */
  shipMode: ShipMode;
}

/** The result of starting an invoice delivery. */
export interface InvoiceDelivery {
  /**
   * The invoice id.
   * @format uuid
   */
  id: string;
  /** The invoice number, assigned on delivery. */
  number?: number;
  /** The invoice status. */
  status?: string;
  /** How the invoice is delivered. */
  shipMode?: string;
  /** The reference number for the payment. */
  referenceNumber?: string;
}

/** The result of deleting an invoice. */
export interface DeletedInvoice {
  /**
   * The id of the deleted invoice.
   * @format uuid
   */
  id: string;
  /** Always true. */
  deleted: boolean;
}

/** A short-lived link to an invoice's PDF. */
export interface InvoicePdfLink {
  /**
   * Path of the PDF on this plugin's server, with a token that works for 10 minutes. Resolve it
   * against the plugin's base URL to open it.
   * @example "/easor/invoice-pdf?token=…"
   */
  path: string;
}
