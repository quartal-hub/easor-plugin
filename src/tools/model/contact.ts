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
