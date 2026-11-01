import { DEALERS, DISCLOSURE_SHORT } from "@/lib/site";

// Dealer affiliate banner. Hidden until at least one dealer link is set in Vercel's environment variables.
// "dashboard" sits right under the signed-in total; "public" sits near the top of the homepage.
export default function WhereToBuy({ variant = "dashboard" }: { variant?: "dashboard" | "public" }) {
  if (!DEALERS.length) return null;
  return (
    <aside className="buy-banner" aria-label="Where to buy">
      <div className="buy-copy">
        <strong>{variant === "dashboard" ? "Adding to your stack?" : "Ready to buy metal?"}</strong>
        <span className="small muted">
          {variant === "dashboard"
            ? "Shop a trusted bullion dealer, then log the purchase here."
            : "Shop a trusted bullion dealer, then track it here for free."}
        </span>
      </div>
      <div className="dealers">
        {DEALERS.map((d) => (
          <a key={d.id} className="button-link primary" href={d.url} target="_blank" rel="sponsored noopener">
            Shop {d.name} ↗
          </a>
        ))}
      </div>
      <p className="small muted buy-note">
        {DISCLOSURE_SHORT} <a href="/disclosure">How these links work</a> ·{" "}
        <a href="http://paidforadvertising.com/" target="_blank" rel="noopener">About paid advertising</a>
      </p>
    </aside>
  );
}
