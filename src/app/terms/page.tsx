import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/legal/LegalPage";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: `Terms of Service | ${APP_NAME}` };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms cover your use of {APP_NAME} at sysd.live. By signing in or using the service you agree to them. If you do not agree, do not use it.</p>

      <h2>What {APP_NAME} is</h2>
      <p>{APP_NAME} is a tool for drawing a system, setting traffic numbers and seeing an estimated cost and where it may break. It is for learning and rough planning.</p>

      <h2>Estimates are not quotes</h2>
      <ul>
        <li>Costs, capacities, load percentages and latency are estimates. Some figures are illustrative placeholders; each row says whether its price is real, yours or illustrative.</li>
        <li>Capacity and sizing figures are rules of thumb, accurate to roughly ±50% at best.</li>
        <li>Provider prices change. Check the provider&apos;s own pricing page or calculator before you commit money. We are not responsible for decisions or costs that follow from an estimate.</li>
      </ul>

      <h2>Your account</h2>
      <p>You sign in with GitHub or Google. You are responsible for activity on your account. Tell us if you think someone else has used it. You must be old enough to form a binding contract where you live.</p>

      <h2>Your content</h2>
      <p>Designs, names, notes and icons you add remain yours. You give us permission to store, process and display them as needed to run the service: saving them, drawing previews, and showing them to anyone you share a link with or invite to a team. Do not upload anything you have no right to use, and nothing unlawful.</p>

      <h2>Share links</h2>
      <p>Anyone with a share link who is signed in can view that design. Treat a link like a password: revoke it from the design&apos;s share menu if it should no longer work. Views are counted, but not who made them.</p>

      <h2>Teams</h2>
      <p>Team owners control who joins and at what level (viewer or editor). Designs in a team can be seen and, for editors, changed by its members.</p>

      <h2>Plans and payment</h2>
      <p>{APP_NAME} is free to use. A paid Pro plan (AI agent, teams, exports) is planned. When payments launch, prices, billing terms and refund rules will be shown before you pay and will apply to that purchase. Features may move between plans.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No attempts to break, overload or probe the service, or to get around plan limits, access rules or rate limits.</li>
        <li>No scraping the service or using it to build a competing dataset.</li>
        <li>No uploading malware or content that harms others.</li>
      </ul>
      <p>We may suspend or remove accounts or content that break these rules.</p>

      <h2>Availability and changes</h2>
      <p>The service is provided as it is, may have bugs, and may change or go down. We may add, change or remove features. We can update these terms; the date above shows the latest version, and using the service after a change means you accept it.</p>

      <h2>No warranty and limits on liability</h2>
      <p>To the extent the law allows, the service comes with no warranties, and we are not liable for indirect or consequential loss, lost profit or lost data. Our total liability for any claim is limited to what you paid us in the 12 months before it, or zero if you use the free plan. Nothing here limits liability that cannot be limited by law.</p>

      <h2>Ending your use</h2>
      <p>You can stop using {APP_NAME} at any time. To have your account and designs deleted, contact us (see below). We may end access for breach of these terms.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India. Courts in India have jurisdiction, unless the law of where you live gives you rights that cannot be waived.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: <Contact />.</p>
    </LegalPage>
  );
}
