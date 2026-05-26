import { gifts, recipients, selectGiftProducts } from "./product-data.js";

const DEFAULT_AGENT_PROFILE = "https://shopify.dev/ucp/agent-profiles/examples/2026-04-08/valid-with-capabilities.json";
const GLOBAL_CATALOG_ENDPOINT = "https://catalog.shopify.com/api/ucp/mcp";

export async function loadProductCandidates({
  input = "",
  person = recipients[0],
  preferLive = false,
  limit = 12,
  fetchImpl = globalThis.fetch
} = {}) {
  if (preferLive && hasShopifyCatalogConfig() && typeof fetchImpl === "function") {
    try {
      const products = await fetchShopifyCatalogProducts({ input, person, limit, fetchImpl });
      if (products.length) {
        return {
          source: "shopify_ucp_mcp",
          products
        };
      }
    } catch (error) {
      return {
        source: "mock_retailer_feed",
        fallbackReason: error instanceof Error ? error.message : "Shopify catalog MCP search failed.",
        products: selectGiftProducts({ input, person, products: gifts, limit })
      };
    }
  }

  return {
    source: "mock_retailer_feed",
    products: selectGiftProducts({ input, person, products: gifts, limit })
  };
}

export async function fetchShopifyCatalogProducts({ input = "", person = recipients[0], limit = 12, fetchImpl = globalThis.fetch } = {}) {
  const endpoint = getShopifyCatalogEndpoint();
  const profile = process.env.SHOPIFY_UCP_AGENT_PROFILE || DEFAULT_AGENT_PROFILE;
  const query = buildProductSearchQuery({ input, person });

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "kinloop-catalog-search",
      method: "tools/call",
      params: {
        name: "search_catalog",
        arguments: {
          meta: {
            "ucp-agent": { profile }
          },
          catalog: {
            query,
            context: {
              address_country: process.env.KINLOOP_SHOPPER_COUNTRY || "US",
              currency: process.env.KINLOOP_SHOPPER_CURRENCY || "GBP",
              intent: `Gift for ${person?.relation || "someone close"} who likes ${(person?.likes || []).join(", ")}`
            },
            pagination: { limit }
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Shopify catalog MCP returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const products = extractCatalogProducts(payload).slice(0, limit).map(normalizeCatalogProduct);
  return products.filter((product) => product.id && product.name);
}

export function buildProductSearchQuery({ input = "", person = recipients[0] } = {}) {
  const signal = input
    .split(/\r?\n/)
    .map((line) => line.replace(/^-\s*(lead|interests|avoid|budget|delivery):/i, "").trim())
    .filter((line) => line && !/^(source|recipient|from|subject|received|message):/i.test(line))
    .slice(0, 4)
    .join(" ");

  return [
    signal,
    ...(person?.likes || []),
    person?.budget,
    "birthday gift"
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 240);
}

function hasShopifyCatalogConfig() {
  return process.env.SHOPIFY_UCP_DISABLED !== "1";
}

function getShopifyCatalogEndpoint() {
  if (process.env.SHOPIFY_UCP_MCP_ENDPOINT) return process.env.SHOPIFY_UCP_MCP_ENDPOINT;
  if (process.env.SHOPIFY_STOREFRONT_DOMAIN) {
    const domain = process.env.SHOPIFY_STOREFRONT_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${domain}/api/ucp/mcp`;
  }
  return GLOBAL_CATALOG_ENDPOINT;
}

function extractCatalogProducts(payload) {
  const parsedTextContent = (payload?.result?.content || [])
    .map((item) => parseMaybeJson(item?.text))
    .filter(Boolean);

  return collectProductLikeObjects([
    payload?.result?.structuredContent,
    payload?.result?.data,
    payload?.result,
    ...parsedTextContent
  ]);
}

function collectProductLikeObjects(value, collected = []) {
  if (!value || collected.length >= 50) return collected;

  if (Array.isArray(value)) {
    for (const item of value) collectProductLikeObjects(item, collected);
    return collected;
  }

  if (typeof value !== "object") return collected;

  const hasProductIdentity = value.id || value.product_id || value.productId || value.gid;
  const hasProductName = value.title || value.name || value.product_title;
  if (hasProductIdentity && hasProductName) {
    collected.push(value);
  }

  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") collectProductLikeObjects(nested, collected);
  }

  return collected;
}

function normalizeCatalogProduct(product) {
  const price = resolvePrice(product);
  const seller = product.seller?.name || product.merchant?.name || product.shop?.name || product.vendor || "Shopify merchant";
  const name = product.title || product.name || product.product_title;
  const category = product.category || product.product_type || product.type || "Gift";

  return {
    id: String(product.id || product.product_id || product.productId || product.gid),
    name,
    caption: product.description || product.summary || `${name} from ${seller}.`,
    price: price.amount,
    displayPrice: price.label,
    delivery: product.delivery || product.delivery_label || product.shipping?.summary || "Delivery shown at merchant checkout",
    seller,
    returns: product.returns || product.return_policy || "Check merchant policy",
    match: category,
    score: Number(product.score || product.relevance_score || 80),
    photo: product.image?.url || product.featured_image?.url || product.image || "",
    why: product.why || `Matched from Shopify catalog search for ${category.toString().toLowerCase()} signals.`,
    consider: product.consider || "Confirm availability, delivery, and return policy before approving.",
    basedOn: [name, category, seller].filter(Boolean),
    catalog: {
      sku: product.sku || product.handle || product.id || product.product_id || product.productId || product.gid,
      category,
      inventoryStatus: product.available === false ? "Unavailable" : "Available",
      merchantRating: product.merchantRating || product.rating || null
    }
  };
}

function resolvePrice(product) {
  const raw = product.price || product.priceRange?.minVariantPrice || product.offer?.price || product.variant?.price || {};
  const rawAmount = Number(raw.amount || raw.value || raw);
  const currency = raw.currencyCode || raw.currency || product.currency || "GBP";
  const amount = Number.isFinite(rawAmount) && rawAmount > 999 ? rawAmount / 100 : rawAmount;

  if (Number.isFinite(amount)) {
    return {
      amount,
      label: `${currency} ${amount.toFixed(2)}`
    };
  }

  return {
    amount: 0,
    label: product.displayPrice || product.price_label || "Price shown by merchant"
  };
}

function parseMaybeJson(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
