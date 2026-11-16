import { salesGet } from "./easor/client.ts";
import type { SalesAccount, SalesAccountList } from "./model/account.ts";

/** A sales account as the API returns it. */
interface ApiSalesAccount {
  number: number;
  name?: string;
  vatPercent: number;
  removedDate?: string | null;
}

/** The organization's sales accounts that are still in use. */
export async function activeSalesAccounts(): Promise<SalesAccount[]> {
  const accounts = await salesGet<ApiSalesAccount[]>("/settings/accounts/sales");
  const active = accounts
    .filter((account) => !account.removedDate)
    .map((account) => ({ number: account.number, name: account.name, vatPercent: account.vatPercent }));
  // The API can list the same account twice.
  return active.filter(
    (account, index) =>
      active.findIndex((other) => other.number === account.number && other.vatPercent === account.vatPercent) === index,
  );
}

/** Sales accounts for invoice lines. */
export class SalesAccounts {
  /**
   * List the active sales accounts and their VAT percentages. An invoice line's sales account and
   * VAT percentage must match one of these.
   * @returns The active sales accounts.
   * @readOnly
   */
  static async list(): Promise<SalesAccountList> {
    return { accounts: await activeSalesAccounts() };
  }
}
