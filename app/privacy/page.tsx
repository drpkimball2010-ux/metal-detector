import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_DATE, SITE_DOMAIN, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Privacy Policy · ${SITE_NAME}` };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated={POLICY_DATE}>
      <p>
        This policy explains what {SITE_NAME} ({SITE_DOMAIN}) collects, why, who helps us run the service, and how you
        can delete your information. We keep it short because we collect very little.
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account details:</strong> your email address and a password. Passwords are stored only in hashed form by our authentication provider; we never see them.</li>
          <li><strong>Your holdings:</strong> the purchases you enter, such as metal, description, quantity, weight, purity, purchase date and the amount you paid.</li>
          <li><strong>Basic technical data:</strong> like any website, our hosting provider receives your IP address and browser type when you visit, and keeps short-term logs for security and troubleshooting.</li>
        </ul>
        <p>We do not collect your name, address, phone number or payment card details, and we don&apos;t use advertising trackers.</p>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To sign you in and keep your account secure.</li>
          <li>To show you your holdings, their value at spot prices, and your gain or loss.</li>
          <li>To send account emails you ask for, such as confirming your email address.</li>
        </ul>
        <p>We do not sell your personal information, and we don&apos;t share your holdings with anyone except the service providers below, who process them only to run the service.</p>
      </section>

      <section>
        <h2>Service providers we use</h2>
        <ul>
          <li><strong>Supabase:</strong> stores your account and holdings, and handles sign-in.</li>
          <li><strong>Vercel:</strong> hosts the website.</li>
          <li><strong>Google Fonts:</strong> serves the site&apos;s typefaces, which means your browser contacts Google to load them.</li>
          <li><strong>MetalpriceAPI:</strong> supplies spot prices. We request prices from it; none of your information is sent to it.</li>
        </ul>
      </section>

      <section>
        <h2>Dealer links</h2>
        <p>
          Some links to bullion dealers are affiliate links. If you click one, the dealer and its affiliate network may
          set cookies to record that you came from {SITE_NAME}. Their own privacy policies apply once you leave our site.
          See our <a href="/disclosure">Affiliate Disclosure</a>.
        </p>
      </section>

      <section>
        <h2>Your choices and deleting your data</h2>
        <ul>
          <li>You can remove any purchase at any time.</li>
          <li>You can delete your account from the <strong>Account</strong> section of the app. This permanently deletes your account and every purchase you entered.</li>
          <li>You can also email us to ask for a copy of your data or to have it deleted.</li>
        </ul>
        <p>Backups kept by our providers are overwritten on their normal schedule.</p>
      </section>

      <section>
        <h2>Who can see your holdings</h2>
        <ul>
          <li><strong>You:</strong> when you&apos;re signed in to your account.</li>
          <li><strong>Other users and the public:</strong> never. Database rules allow each account to read and change only its own purchases, and nothing about your holdings is published or shown on the site.</li>
          <li><strong>Us:</strong> as the operator, we have administrator access to the database so we can keep the service running and fix problems. We only look at a specific account&apos;s data to help when you ask us to, to investigate abuse or a technical problem, or when the law requires it.</li>
          <li><strong>Our service providers:</strong> Supabase stores the data on our behalf and is bound by its own security and privacy commitments.</li>
          <li><strong>Legal requests:</strong> we may disclose information if required by a valid legal process, such as a court order. Because we never collect your name, address or where you store your metal, there is very little to disclose beyond your email address and the purchases you entered.</li>
        </ul>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Data is sent over encrypted connections (HTTPS), and database rules ensure each account can read and change only
          its own holdings. No system is perfectly secure, so please use a strong, unique password.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>{SITE_NAME} is not intended for children under 13, and we don&apos;t knowingly collect information from them.</p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>If we change this policy, we&apos;ll update the date at the top, and for significant changes we&apos;ll notify you by email or in the app.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Questions or requests: <span className="sel">{CONTACT_EMAIL}</span></p>
      </section>
    </LegalPage>
  );
}
