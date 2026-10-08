/** What Pro costs. The one place prices live; the upgrade page reads from here. */
export const PRO_PRICES = {
  USD: { symbol: "$", month: 9, year: 79, founding: 6 },
  // Lower than a straight conversion on purpose: the same amount is a bigger bite in India.
  INR: { symbol: "₹", month: 499, year: 3999, founding: 349 },
} as const;
export type Currency = keyof typeof PRO_PRICES;
