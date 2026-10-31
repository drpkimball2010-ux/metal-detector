import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_DATE, SITE_DOMAIN, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Terms of Use · ${SITE_NAME}` };

export default function Terms() {
  return (
    <LegalPage title="Terms of Use" updated={POLICY_DATE}>
      <p>
        These terms apply when you use {SITE_NAME} at {SITE_DOMAIN}. By creating an account or using the site, you agree
        to them. If you don&apos;t agree, please don&apos;t use the service.
      </p>

      <section>
        <h2>What the service is</h2>
        <p>
          {SITE_NAME} is a tool for recording precious metals you own and estimating their value. It shows melt value:
          the fine metal weight of your items multiplied by a spot price. It does not buy, sell or hold metals for you.
        </p>
      </section>

      <section>
        <h2>Not financial advice</h2>
        <p>
          Everything shown is for information only. Nothing on the site is investment, financial, legal or tax advice,
          or a recommendation to buy or sell anything. Make your own decisions and consult a qualified professional when
          you need advice.
        </p>
      </section>

      <section>
        <h2>Prices and accuracy</h2>
        <ul>
          <li>Spot prices come from a third-party data provider, refresh about every 10 minutes, and may be delayed, incomplete or wrong.</li>
          <li>Melt value is an estimate. What a dealer pays you can be lower than spot, and collectible or graded items can be worth more.</li>
          <li>Values depend on the details you enter, such as weight and purity. Please check them.</li>
        </ul>
        <p>Don&apos;t rely on {SITE_NAME} as your only record for insurance, taxes or sales.</p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>Give a valid email address and keep your password private. You&apos;re responsible for activity on your account.</li>
          <li>You must be at least 13 years old to use the service.</li>
          <li>Don&apos;t misuse the service: no attempts to break in, overload it, access other people&apos;s data, or copy its price data for resale.</li>
          <li>You can delete your account at any time from the Account section of the app. We may suspend accounts that break these terms.</li>
        </ul>
      </section>

      <section>
        <h2>Your data</h2>
        <p>
          The holdings you enter belong to you. You let us store and process them only to run the service for you, as
          described in our <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>Dealer links</h2>
        <p>
          The site may link to bullion dealers, and some of those links earn us a commission (see our{" "}
          <a href="/disclosure">Affiliate Disclosure</a>). Dealers are independent businesses. Your purchases from them
          are between you and the dealer, under the dealer&apos;s terms.
        </p>
      </section>

      <section>
        <h2>Changes and availability</h2>
        <p>
          We may change, pause or stop parts of the service, and we may update these terms. If we make significant
          changes, we&apos;ll update the date above and let you know in the app or by email. Continuing to use the
          service after a change means you accept the updated terms.
        </p>
      </section>

      <section>
        <h2>No warranty and limits on liability</h2>
        <p>
          The service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind. To the
          fullest extent the law allows, {SITE_NAME} is not liable for indirect or consequential losses, or for losses from
          decisions made using the information shown, including trading or investment losses.
        </p>
      </section>

      <section>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of the State of Texas, United States.</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>Questions about these terms: <span className="sel">{CONTACT_EMAIL}</span></p>
      </section>
    </LegalPage>
  );
}
