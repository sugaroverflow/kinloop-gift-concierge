import catalog from "../data/kinloop/catalog.json" with { type: "json" };
import people from "../data/kinloop/people.json" with { type: "json" };

export const recipients = people;
export const gifts = catalog;

export function giftById(id) {
  return gifts.find((gift) => gift.id === id) || gifts[0];
}
