/** Search and paging for products. */
export interface FindProductsInput {
  /** Text to search for in the product name or number. Omit to list all products. */
  search?: string;
  /** How many products to skip, for paging. Defaults to 0. */
  offset?: number;
  /** How many products to return at most. Defaults to 20. */
  limit?: number;
}

/** A product or service in the product register. */
export interface Product {
  /**
   * The product id, for `productId` on an invoice line.
   * @format uuid
   */
  id: string;
  /** The product number. */
  number?: string;
  /** The name. */
  name?: string;
  /** A longer description. */
  description?: string;
  /** The unit, such as `kpl` or `h`. */
  unit?: string;
  /** The price of one unit, excluding tax. */
  pricePerUnit?: number;
  /** The price of one unit, including tax. */
  pricePerUnitTaxIncluded?: number;
  /** The VAT percentage. */
  vatPercent?: number;
  /** The sales account number. */
  salesAccountNumber?: number;
}

/** A page of products. */
export interface ProductList {
  /** The products on this page. */
  products: Product[];
  /** How many products match in total, across all pages. */
  totalCount?: number;
  /** The offset of this page. */
  offset: number;
  /**
   * True when more products match than this page has, so the list is incomplete: get the next page
   * with `offset` set to `nextOffset`, or narrow the filters, before drawing conclusions from it.
   */
  hasMore: boolean;
  /** The offset of the next page, when `hasMore` is true. */
  nextOffset?: number;
}
