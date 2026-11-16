/** A sales account, used on invoice lines. */
export interface SalesAccount {
  /** The account number. Several accounts can share a number with different VAT percentages. */
  number: number;
  /** The account name. */
  name?: string;
  /** The VAT percentage of the account. */
  vatPercent: number;
}

/** The organization's active sales accounts. */
export interface SalesAccountList {
  /** The active sales accounts. */
  accounts: SalesAccount[];
}

/** No input: the tool lists every active sales account. */
export interface ListSalesAccountsInput {}
