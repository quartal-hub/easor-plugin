import type { QuartalPluginContext } from "@quartal/plugin";
import { logToolCall } from "./easor/log.ts";
import { pageInfo } from "./easor/paging.ts";
import { salesGet } from "./easor/client.ts";
import type { FindProductsInput, Product, ProductList } from "./model/product.ts";

/** A product as the API returns it. */
interface ApiProduct {
  id: string;
  number?: string;
  name?: string;
  description?: string;
  unit?: string;
  pricePerUnit?: number;
  pricePerUnitTaxIncluded?: number;
  vatPercent?: number;
  salesAccountNumber?: number;
}

interface ApiProductResponse {
  items?: ApiProduct[];
  totalCount?: number;
  totalcount?: number;
}

/** Treats the API's empty strings as missing values. */
function text(value: string | null | undefined): string | undefined {
  return value || undefined;
}

function toProduct(product: ApiProduct): Product {
  return {
    id: product.id,
    number: text(product.number),
    name: text(product.name),
    description: text(product.description),
    unit: text(product.unit),
    pricePerUnit: product.pricePerUnit,
    pricePerUnitTaxIncluded: product.pricePerUnitTaxIncluded,
    vatPercent: product.vatPercent,
    salesAccountNumber: product.salesAccountNumber,
  };
}

/** Gets a product from the register by its id. */
export async function fetchProduct(id: string): Promise<Product> {
  const response = await salesGet<ApiProductResponse>("/products", { productId: id });
  const product = response.items?.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`No product with id ${id}.`);
  return toProduct(product);
}

/** The product register in Easor. */
export class Products {
  /**
   * Find products and services in the product register by name or number, for example to get the
   * `productId` and price for an invoice line in `createInvoice`.
   * When `hasMore` is true, more products match: page on with `nextOffset` or search more precisely.
   * @param input - The search text and paging.
   * @returns A page of matching products.
   * @readOnly
   */
  static async find(input: FindProductsInput, ctx?: QuartalPluginContext): Promise<ProductList> {
    return logToolCall("findProducts", ctx, async () => {
      const offset = input.offset ?? 0;
      const response = await salesGet<ApiProductResponse>("/products", {
        searchKeyWord: input.search,
        offset,
        limit: input.limit ?? 20,
      });
      return {
        products: (response.items ?? []).map(toProduct),
        ...pageInfo(offset, response.items?.length ?? 0, response.totalCount ?? response.totalcount),
      };
    });
  }
}
