import { PRODUCT_ICON, PROVIDER_ICON, TYPE_ICON } from "./iconMap";
import type { Offering } from "./types";
import { BRAND_ICONS } from "./brandIcons.generated";

/** Service icon if the product has one, else the company logo, else the type's own brand mark. */
export function brandIconId(typeId: string, offering?: Offering): string | undefined {
  const candidates = [
    offering && PRODUCT_ICON[`${offering.provider}|${offering.product}`],
    offering && PROVIDER_ICON[offering.provider],
    TYPE_ICON[typeId],
  ];
  return candidates.find((id): id is string => Boolean(id) && id! in BRAND_ICONS);
}
