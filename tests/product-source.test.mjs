import test from "node:test";
import assert from "node:assert/strict";
import { buildProductSearchQuery, fetchShopifyCatalogProducts, loadProductCandidates } from "../lib/product-source.js";
import { recipients } from "../lib/product-data.js";

function withEnv(overrides, fn) {
  const original = {};
  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

test("Shopify catalog fetch posts UCP MCP search request and normalizes products", async () => {
  await withEnv({
    SHOPIFY_UCP_MCP_ENDPOINT: "https://catalog.example.test/mcp",
    SHOPIFY_UCP_AGENT_PROFILE: "https://agent-profile.example.test/profile.json",
    KINLOOP_SHOPPER_COUNTRY: "GB",
    KINLOOP_SHOPPER_CURRENCY: "GBP"
  }, async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () => ({
          result: {
            structuredContent: {
              products: [
                {
                  gid: "gid://shopify/Product/101",
                  title: "Handmade Ceramic Espresso Cup",
                  description: "A small-batch cup from an independent maker.",
                  priceRange: { minVariantPrice: { amount: "42", currencyCode: "GBP" } },
                  merchant: { name: "North Kiln" },
                  product_type: "Ceramics",
                  delivery_label: "Arrives by May 31",
                  featured_image: { url: "https://cdn.example.test/cup.jpg" },
                  score: 91
                }
              ]
            }
          }
        })
      };
    };

    const products = await fetchShopifyCatalogProducts({
      input: "Source: kinloop_synthetic_source\n- Lead: Sarah mentioned pottery and espresso.",
      person: recipients[0],
      limit: 5,
      fetchImpl
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://catalog.example.test/mcp");
    assert.equal(calls[0].init.method, "POST");

    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.method, "tools/call");
    assert.equal(body.params.name, "search_catalog");
    assert.equal(body.params.arguments.meta["ucp-agent"].profile, "https://agent-profile.example.test/profile.json");
    assert.equal(body.params.arguments.catalog.pagination.limit, 5);
    assert.match(body.params.arguments.catalog.query, /pottery and espresso/i);
    assert.match(body.params.arguments.catalog.context.intent, /Gift for/i);

    assert.deepEqual(products[0], {
      id: "gid://shopify/Product/101",
      name: "Handmade Ceramic Espresso Cup",
      caption: "A small-batch cup from an independent maker.",
      price: 42,
      displayPrice: "GBP 42.00",
      delivery: "Arrives by May 31",
      seller: "North Kiln",
      returns: "Check merchant policy",
      match: "Ceramics",
      score: 91,
      photo: "https://cdn.example.test/cup.jpg",
      why: "Matched from Shopify catalog search for ceramics signals.",
      consider: "Confirm availability, delivery, and return policy before approving.",
      basedOn: ["Handmade Ceramic Espresso Cup", "Ceramics", "North Kiln"],
      catalog: {
        sku: "gid://shopify/Product/101",
        category: "Ceramics",
        inventoryStatus: "Available",
        merchantRating: null
      }
    });
  });
});

test("product candidate loader uses Shopify UCP MCP source when live products are available", async () => {
  await withEnv({
    SHOPIFY_UCP_MCP_ENDPOINT: "https://catalog.example.test/mcp"
  }, async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                items: [
                  {
                    id: "shopify-product-202",
                    name: "Studio Pottery Workshop",
                    price: { amount: 68, currency: "GBP" },
                    shop: { name: "Clay House" },
                    category: "Experience"
                  }
                ]
              })
            }
          ]
        }
      })
    });

    const result = await loadProductCandidates({
      input: "Pottery class with flexible booking",
      preferLive: true,
      limit: 3,
      fetchImpl
    });

    assert.equal(result.source, "shopify_ucp_mcp");
    assert.equal(result.products.length, 1);
    assert.equal(result.products[0].id, "shopify-product-202");
    assert.equal(result.products[0].seller, "Clay House");
  });
});

test("product candidate loader falls back to mock retailer feed when Shopify UCP MCP fails", async () => {
  await withEnv({
    SHOPIFY_UCP_MCP_ENDPOINT: "https://catalog.example.test/mcp"
  }, async () => {
    const result = await loadProductCandidates({
      input: "Sarah mentioned ceramics, hosting, and espresso.",
      preferLive: true,
      limit: 4,
      fetchImpl: async () => ({ ok: false, status: 503 })
    });

    assert.equal(result.source, "mock_retailer_feed");
    assert.match(result.fallbackReason, /HTTP 503/);
    assert.equal(result.products.length, 4);
    assert.equal(result.products.every((product) => product.catalog?.sku), true);
  });
});

test("product candidate loader uses Shopify Global Catalog by default when live products are requested", async () => {
  await withEnv({
    SHOPIFY_UCP_MCP_ENDPOINT: undefined,
    SHOPIFY_STOREFRONT_DOMAIN: undefined
  }, async () => {
    const calls = [];
    const result = await loadProductCandidates({
      input: "espresso and pottery",
      preferLive: true,
      limit: 2,
      fetchImpl: async (url) => {
        calls.push(url);
        return {
          ok: true,
          json: async () => ({
            result: {
              structuredContent: {
                products: [{
                  id: "gid://shopify/Product/303",
                  title: "Espresso Cup Set",
                  price: { amount: 3600, currency: "GBP" },
                  vendor: "Cup Works"
                }]
              }
            }
          })
        };
      }
    });

    assert.deepEqual(calls, ["https://catalog.shopify.com/api/ucp/mcp"]);
    assert.equal(result.source, "shopify_ucp_mcp");
    assert.equal(result.products[0].id, "gid://shopify/Product/303");
  });
});

test("product search query strips AgentMail metadata and preserves shopper signal", () => {
  const query = buildProductSearchQuery({
    input: [
      "Source: kinloop_synthetic_source",
      "Recipient: sarah",
      "From: friend@example.com",
      "Subject: birthday",
      "- Lead: Sarah mentioned pottery, espresso, and hosting.",
      "- Budget: GBP 40-75"
    ].join("\n"),
    person: recipients[0]
  });

  assert.doesNotMatch(query, /kinloop_synthetic_source|friend@example.com|Recipient:/i);
  assert.match(query, /pottery, espresso, and hosting/i);
  assert.match(query, /birthday gift/i);
  assert.equal(query.length <= 240, true);
});
