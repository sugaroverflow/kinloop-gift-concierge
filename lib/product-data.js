import productFeed from "../data/kinloop/mock-product-feed.json" with { type: "json" };
import people from "../data/kinloop/people.json" with { type: "json" };

export const recipients = people;
export const mockProductFeed = productFeed;
export const gifts = productFeed.products;

export function giftById(id) {
  return gifts.find((gift) => gift.id === id) || gifts[0];
}

export function selectGiftProducts({ input = "", person = recipients[0], products = gifts, limit = 3 } = {}) {
  const query = [
    input,
    person?.name,
    person?.relation,
    person?.note,
    ...(person?.likes || []),
    ...(person?.avoid || [])
  ].join(" ").toLowerCase();

  return products
    .map((product) => ({
      product,
      rank: scoreProduct(product, query)
    }))
    .sort((left, right) => right.rank - left.rank || right.product.score - left.product.score)
    .map(({ product }) => product)
    .slice(0, limit);
}

function scoreProduct(product, query) {
  const haystack = [
    product.name,
    product.caption,
    product.why,
    product.consider,
    product.catalog?.category,
    ...(product.basedOn || [])
  ].join(" ").toLowerCase();

  const lexicalScore = haystack
    .split(/\W+/)
    .filter((word) => word.length > 3 && query.includes(word))
    .length;

  return lexicalScore * 10 + Number(product.score || 0);
}
