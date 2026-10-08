import { redirect } from "next/navigation";

/** Designs now live on the home page. This keeps old links working. */
export default function DesignsPage() {
  redirect("/home");
}
