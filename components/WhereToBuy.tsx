import { DEALERS, DISCLOSURE_SHORT } from "@/lib/site";

// Shown only once at least one dealer link is set in Vercel's environment variables.
export default function WhereToBuy() {
  if (!DEALERS.length) return null;
  return (
    <section>
      <div className="sechead">
        <h2>Add to your stack</h2>
        <a className="small" href="/disclosure">How these links work</a>
      </div>
      <div className="dealers">
        {DEALERS.map((d) => (
          <a key={d.id} className="button-link" href={d.url} target="_blank" rel="sponsored noopener">
            Shop {d.name} ↗
          </a>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {DISCLOSURE_SHORT}{" "}
        <a href="http://paidforadvertising.com/" target="_blank" rel="noopener">About paid advertising</a>
      </p>
    </section>
  );
}
