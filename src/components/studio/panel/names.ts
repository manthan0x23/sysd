import { TYPE_BY_ID } from "@/lib/catalog";
import type { StudioNode } from "@/lib/model";

/** What to call a node: the user's name for it, else its service type. */
export const nameOf = (n: StudioNode) => n.data.name || TYPE_BY_ID[n.data.typeId].short || TYPE_BY_ID[n.data.typeId].label;
