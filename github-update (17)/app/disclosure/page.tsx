import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, POLICY_DATE, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: `Affiliate Disclosure · ${SITE_NAME}` };

export default function Disclosure() {
  return (
    <LegalPage title="Affiliate Disclosure" updated={POLICY_DATE}>
      <p>
        {SITE_NAME} is free to use. To help pay for it, some links to bullion dealers (such as JM Bullion, APMEX and
        SD Bullion) are <strong>affiliate links</strong>. If you click one and then buy something, we may earn a
        commission from the dealer.
      </p>

      <section>
        <h2>What that means for you</h2>
        <ul>
          <li>You pay the same price whether or not you use our link.</li>
          <li>Commissions never change your numbers. Spot prices and your stack&apos;s value come from market data, not from any dealer.</li>
          <li>We don&apos;t accept payment to rank, review or recommend a dealer, and a dealer link is not an endorsement of every product it sells.</li>
          <li>Compare prices and premiums yourself before you buy.</li>
        </ul>
      </section>

      <section>
        <h2>How tracking works</h2>
        <p>
          When you click a dealer link, the dealer and its affiliate network may set a cookie that records the visit came
          from {SITE_NAME}. We don&apos;t receive your name, payment details or what you bought, only reports of commissions earned.
        </p>
        <p>
          Our affiliate links are tracked by Awin, an affiliate network. To learn more about paid and affiliate
          advertising, visit <a href="http://paidforadvertising.com/" target="_blank" rel="noopener">paidforadvertising.com</a>.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>Email <span className="sel">{CONTACT_EMAIL}</span>.</p>
      </section>
    </LegalPage>
  );
}
