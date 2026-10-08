import type { Metadata } from "next";
import { Contact, LegalPage } from "@/components/legal/LegalPage";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: `Privacy Policy | ${APP_NAME}` };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This explains what {APP_NAME} (sysd.live) collects, why, and who else handles it.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Sign-in details:</b> your name, email address and profile picture, from GitHub or Google. Nothing else is requested, and we never see your provider password.</li>
        <li><b>Your content:</b> designs you save (services, links, traffic numbers, names, notes, uploaded icons), their titles and status, and the preview image we draw for each.</li>
        <li><b>Sharing and team data:</b> share links you create with a view count and last-viewed time (not who viewed), team names, members, roles and invites.</li>
        <li><b>Plan:</b> whether your account is Free or Pro.</li>
        <li><b>Technical data:</b> standard server logs kept by our hosting (such as IP address, browser and requested page) for security and reliability.</li>
      </ul>
      <p>We do not run advertising or analytics trackers.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To sign you in and keep your designs in your profile.</li>
        <li>To show shared designs to people you give a link to, and team designs to team members.</li>
        <li>To enforce plan limits, prevent abuse and keep the service running.</li>
      </ul>
      <p>We do not sell your data.</p>

      <h2>Cookies</h2>
      <p>We use a session cookie that keeps you signed in, plus the short-lived cookies the sign-in flow needs for security. We also keep a few display settings (theme, which panels are folded) in your browser&apos;s local storage. These are needed for the service to work.</p>

      <h2>Who else handles your data</h2>
      <ul>
        <li><b>GitHub and Google</b> for sign-in.</li>
        <li><b>Vercel</b> hosts the website and receives requests to it.</li>
        <li><b>Neon</b> hosts the database that stores your account and designs.</li>
        <li>A <b>payment provider</b>, once paid plans launch. We will name it here before then.</li>
      </ul>
      <p>These providers may process data outside India. We share data otherwise only if the law requires it.</p>

      <h2>Who can see your designs</h2>
      <p>Only you, until you share. Anyone you send a share link to (they must sign in) can view that design. Team members can see their team&apos;s designs. We do not read your designs except to fix a problem or investigate abuse.</p>

      <h2>How long we keep it</h2>
      <p>Until you delete a design or ask us to delete your account. Deleting a design removes its share links. Backups at our database provider may keep copies for a short time after.</p>

      <h2>Your choices</h2>
      <p>You can edit or delete your designs and revoke share links in the app. There is no self-serve account deletion yet. To delete your account, get a copy of your data or correct it, contact us. You can also remove {APP_NAME}&apos;s access from your GitHub or Google account settings.</p>

      <h2>Security</h2>
      <p>Access is checked on the server for every design, share and team action, and share and invite tokens are random and unguessable. No system is perfectly secure, so keep sensitive secrets out of designs.</p>

      <h2>Children</h2>
      <p>{APP_NAME} is not meant for children under 13, and we do not knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If we change this policy the date above changes. For significant changes we will say so in the app.</p>

      <h2>Contact</h2>
      <p>Privacy questions or requests: <Contact />.</p>
    </LegalPage>
  );
}
