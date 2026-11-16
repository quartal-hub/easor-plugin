import type { ShipMode } from "./invoice.ts";

/** Search and paging for contacts. */
export interface FindContactsInput {
  /** Text to search for, such as part of the name or the business id. Omit to list all contacts. */
  search?: string;
  /** How many contacts to skip, for paging. Defaults to 0. */
  offset?: number;
  /** How many contacts to return at most. Defaults to 20. */
  limit?: number;
}

/** A customer contact. */
export interface Contact {
  /**
   * The contact id.
   * @format uuid
   */
  id: string;
  /** The contact (customer) number. */
  number?: number;
  /** The name. */
  name?: string;
  /** `Business` or `Consumer`. */
  type?: string;
  /** The business id (Y-tunnus). */
  businessId?: string;
  /** The email address. */
  email?: string;
  /** The city of the invoicing address. */
  city?: string;
  /** How invoices to this contact are delivered by default. */
  defaultShipMode?: string;
  /** The contact's payment term in days. */
  paymentTermDays?: number;
}

/** A page of contacts. */
export interface ContactList {
  /** The contacts on this page. */
  contacts: Contact[];
  /** How many contacts match in total, across all pages. */
  totalCount?: number;
  /** The offset of this page. */
  offset: number;
  /**
   * True when more contacts match than this page has, so the list is incomplete: get the next page
   * with `offset` set to `nextOffset`, or narrow the filters, before drawing conclusions from it.
   */
  hasMore: boolean;
  /** The offset of the next page, when `hasMore` is true. */
  nextOffset?: number;
}

/** The language invoices to a contact are written in. */
export type InvoiceLanguage = "fi-FI" | "sv-SE" | "en-GB" | "de-DE";

/** A contact's invoicing address. */
export interface NewContactAddress {
  /**
   * The street address.
   * @example "Mannerheimintie 1"
   */
  street: string;
  /**
   * A second address line, such as an apartment.
   */
  street2?: string;
  /**
   * The postal code.
   * @example "00100"
   */
  postalCode: string;
  /**
   * The post office (city).
   * @example "Helsinki"
   */
  city: string;
  /**
   * The country as an ISO 3166 alpha-2 code. Defaults to `FI`.
   * @example "FI"
   */
  country?: string;
}

/** A new customer contact. */
export interface CreateContactInput {
  /** `Business` for a company or other organization, `Consumer` for a private person. */
  type: "Business" | "Consumer";
  /**
   * The name, at most 45 characters.
   */
  name: string;
  /**
   * A continuation of the name, such as a department.
   */
  nameExtension?: string;
  /**
   * The business id (Y-tunnus). A business needs this or `vatId`.
   * @example "1234567-1"
   */
  businessId?: string;
  /**
   * The VAT number, for a foreign business without a Finnish business id.
   */
  vatId?: string;
  /** The invoicing address. */
  address: NewContactAddress;
  /**
   * The email address.
   * @format email
   */
  email?: string;
  /**
   * The phone number.
   */
  phone?: string;
  /**
   * The mobile phone number.
   */
  mobilePhone?: string;
  /** The contact (customer) number. Defaults to the next free number. */
  number?: number;
  /**
   * How invoices to this contact are delivered by default. `EInvoice` needs `eInvoiceAddress` and
   * `eInvoiceOperator`, `EmailInvoice` needs `invoicingEmail`.
   */
  defaultShipMode?: ShipMode;
  /**
   * The e-invoice address (OVT or IBAN), for `EInvoice` delivery.
   * @example "003712345671"
   */
  eInvoiceAddress?: string;
  /**
   * The e-invoice operator id, for `EInvoice` delivery.
   * @example "003721291126"
   */
  eInvoiceOperator?: string;
  /**
   * The address invoices are emailed to, for `EmailInvoice` delivery.
   * @format email
   */
  invoicingEmail?: string;
  /**
   * The payment term in days, at most 999. Defaults to the organization's payment term.
   */
  paymentTermDays?: number;
  /** The language of invoices to this contact. Defaults to `fi-FI`. */
  invoiceLanguage?: InvoiceLanguage;
  /**
   * The currency as an ISO 4217 code. Defaults to `EUR`.
   */
  currency?: string;
  /**
   * The receivables account number. Defaults to 1701, the standard sales receivables account, or
   * else to the organization's only active receivables account.
   * @example 1701
   */
  receivableAccountNumber?: number;
}
