import { pageInfo } from "./easor/paging.ts";
import { salesGet } from "./easor/client.ts";
import type { Contact, ContactList, FindContactsInput } from "./model/contact.ts";

/** A contact as the API returns it. */
interface ApiContact {
  id: string;
  number?: number;
  name?: string;
  type?: string;
  businessId?: string;
  email?: string;
  invoicingAddress?: { postOffice?: string };
  defaultDeliveryMethod?: string;
  paymentTerm?: number;
}

/** Treats the API's empty strings as missing values. */
function text(value: string | null | undefined): string | undefined {
  return value || undefined;
}

/** Customer contacts in Easor. */
export class Contacts {
  /**
   * Find customer contacts by name, business id or other text, for example to get the contact id
   * for `createInvoice` or `listInvoices`.
   * When `hasMore` is true, more contacts match: page on with `nextOffset` or search more precisely.
   * @param input - The search text and paging.
   * @returns A page of matching contacts.
   * @readOnly
   */
  static async find(input: FindContactsInput): Promise<ContactList> {
    const offset = input.offset ?? 0;
    const response = await salesGet<{ items?: ApiContact[]; totalCount?: number; totalcount?: number }>("/contacts", {
      searchKeyWord: input.search,
      offset,
      limit: input.limit ?? 20,
    });
    return {
      contacts: (response.items ?? []).map((contact): Contact => ({
        id: contact.id,
        number: contact.number,
        name: text(contact.name),
        type: text(contact.type),
        businessId: text(contact.businessId),
        email: text(contact.email),
        city: text(contact.invoicingAddress?.postOffice),
        defaultShipMode: text(contact.defaultDeliveryMethod),
        paymentTermDays: contact.paymentTerm,
      })),
      ...pageInfo(offset, response.items?.length ?? 0, response.totalCount ?? response.totalcount),
    };
  }
}
