import type { QuartalPluginContext } from "@quartal/plugin";
import { logToolCall } from "./easor/log.ts";
import { pageInfo } from "./easor/paging.ts";
import { organizationNumber, salesGet, salesRequest } from "./easor/client.ts";
import type { Contact, ContactList, CreateContactInput, FindContactsInput } from "./model/contact.ts";

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

/** A receivables account as the API returns it. */
interface ApiReceivableAccount {
  number: number;
  name?: string;
  removedDate?: string | null;
}

/** Treats the API's empty strings as missing values. */
function text(value: string | null | undefined): string | undefined {
  return value || undefined;
}

function toContact(contact: ApiContact): Contact {
  return {
    id: contact.id,
    number: contact.number,
    name: text(contact.name),
    type: text(contact.type),
    businessId: text(contact.businessId),
    email: text(contact.email),
    city: text(contact.invoicingAddress?.postOffice),
    defaultShipMode: text(contact.defaultDeliveryMethod),
    paymentTermDays: contact.paymentTerm,
  };
}

/** The standard Finnish account for sales receivables (myyntisaamiset). */
const DEFAULT_RECEIVABLE_ACCOUNT = 1701;

/**
 * Picks the receivables account of a new contact: the given one, else the standard sales
 * receivables account 1701 when it is active, else the organization's only active one. Other
 * active accounts, such as a clearing account, are not meant as a contact's default.
 */
async function receivableAccountFor(requested: number | undefined): Promise<number> {
  if (requested !== undefined) return requested;
  const accounts = await salesGet<ApiReceivableAccount[]>("/settings/accounts/receivable");
  const numbers = [...new Set(accounts.filter((account) => !account.removedDate).map((account) => account.number))];
  if (numbers.includes(DEFAULT_RECEIVABLE_ACCOUNT)) return DEFAULT_RECEIVABLE_ACCOUNT;
  if (numbers.length === 1) return numbers[0];
  if (numbers.length === 0) throw new Error("The organization has no active receivables account.");
  const names = numbers.map((number) => {
    const name = accounts.find((account) => account.number === number)?.name;
    return name ? `${number} ${name}` : String(number);
  });
  throw new Error(
    `The organization has several receivables accounts (${names.join(", ")}); choose one with receivableAccountNumber.`,
  );
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
  static async find(input: FindContactsInput, ctx?: QuartalPluginContext): Promise<ContactList> {
    return logToolCall("findContacts", ctx, async () => {
      const offset = input.offset ?? 0;
      const response = await salesGet<{ items?: ApiContact[]; totalCount?: number; totalcount?: number }>("/contacts", {
        searchKeyWord: input.search,
        offset,
        limit: input.limit ?? 20,
      });
      return {
        contacts: (response.items ?? []).map(toContact),
        ...pageInfo(offset, response.items?.length ?? 0, response.totalCount ?? response.totalcount),
      };
    });
  }

  /**
   * Create a customer contact, to invoice with `createInvoice`. Check with `findContacts` first that
   * the customer does not exist yet. A business needs its business id (Y-tunnus) or VAT number.
   * @param input - The contact's details.
   * @returns The new contact, with its id and customer number.
   */
  static async create(input: CreateContactInput, ctx?: QuartalPluginContext): Promise<Contact> {
    return logToolCall("createContact", ctx, async () => {
      if (input.type === "Business" && !input.businessId && !input.vatId) {
        throw new Error("A business contact needs a businessId (Y-tunnus) or a vatId.");
      }
      const created = await salesRequest<ApiContact>("POST", "/contacts", {
        body: {
          organizationNumber: organizationNumber(),
          type: input.type,
          // 0 makes Easor assign the next free customer number.
          number: input.number ?? 0,
          name: input.name,
          nameExtension: input.nameExtension,
          businessId: input.businessId,
          vatId: input.vatId,
          invoicingAddress: {
            address1: input.address.street,
            address2: input.address.street2,
            postalCode: input.address.postalCode,
            postOffice: input.address.city,
            country: input.address.country ?? "FI",
          },
          email: input.email,
          phone: input.phone,
          phoneMobile: input.mobilePhone,
          defaultDeliveryMethod: input.defaultShipMode,
          eInvoiceIdentifier: input.eInvoiceAddress,
          eInvoiceIntermediator: input.eInvoiceOperator,
          isEmailInvoicingInUse: input.invoicingEmail ? true : undefined,
          invoicingEmailAddress: input.invoicingEmail,
          paymentTerm: input.paymentTermDays,
          invoiceLanguage: input.invoiceLanguage ?? "fi-FI",
          currency: input.currency ?? "EUR",
          defaultReceivableAccountNumber: await receivableAccountFor(input.receivableAccountNumber),
        },
      });
      return toContact(created);
    });
  }
}
