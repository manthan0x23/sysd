import { TYPE_BY_ID, brandIconId, type Offering } from "@/lib/catalog";
import { BrandIcon } from "./BrandIcon";

/**
 * The icon for a service: the specific product icon (e.g. S3's bucket) where one exists, otherwise the
 * company logo, otherwise the generic icon for the service type. Brand marks sit on a light chip so
 * dark logos stay visible in dark mode.
 */
export function ServiceIcon({ typeId, offering, custom, size = 15, className = "" }: { typeId: string; offering?: Offering; /** A user-uploaded image; overrides the built-in icon. */ custom?: string; size?: number; className?: string }) {
  if (custom) {
    // eslint-disable-next-line @next/next/no-img-element -- small user-supplied data URL, nothing to optimise
    return <span className={`ni has-logo ${className}`}><img className="custom-icon" src={custom} alt="" width={size + 2} height={size + 2} draggable={false} /></span>;
  }
  const brand = brandIconId(typeId, offering);
  if (brand) return <span className={`ni has-logo ${className}`}><BrandIcon id={brand} size={size + 2} /></span>;
  const Icon = TYPE_BY_ID[typeId].icon;
  return <span className={`ni ${className}`}><Icon className="ic" size={size} strokeWidth={1.75} aria-hidden /></span>;
}
