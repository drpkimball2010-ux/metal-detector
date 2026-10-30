import Link from "next/link";
import Auth from "./Auth";
import Footer from "./Footer";
import WhereToBuy from "./WhereToBuy";
import { SITE_NAME } from "@/lib/site";

// Public homepage for visitors who aren't signed in. The figures in the preview are labeled examples.
const EXAMPLE = [
  { name: "Gold", color: "var(--au)", value: "$8,013", oz: "2 × 1 oz bars" },
  { name: "Silver", color: "var(--ag)", value: "$5,362", oz: "100 Silver Eagles" },
  { name: "Platinum", color: "var(--pt)", value: "$1,566", oz: "1 Platinum Eagle" },
];

export default function Landing() {
  return (
    <main className="wrap landing">
      <div className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /><h1>{SITE_NAME}</h1></div>
        <div className="hero-actions">
          <Link className="button-link" href="/demo">Try the demo</Link>
          <a className="button-link" href="#signin">Sign in</a>
        </div>
      </div>

      <section className="hero-landing">
        <div className="hero-copy">
          <p className="eyebrow">Free precious metals tracker</p>
          <h2 className="display">Know what your stack is worth, right now.</h2>
          <p className="lede">
            Log every coin, bar and round you buy. {SITE_NAME} weighs out the fine metal, prices it at live spot,
            and shows your total value and your gain or loss against what you paid.
            Already keep a spreadsheet? Drop it in and your whole stack is loaded in seconds.
          </p>
          <div className="hero-actions">
            <Link className="button-link primary" href="/demo">Try the demo, no account needed</Link>
            <a className="button-link" href="#get-started">Create a free account</a>
          </div>
        </div>

        <div className="preview" aria-label="Example of the dashboard">
          <Link className="preview-tag small" href="/demo">Example stack · Try it →</Link>
          <div className="eyebrow">Melt value at spot</div>
          <div className="preview-total num">$14,940.86</div>
          <div className="small up num">Up $1,212.40 (+8.8%)</div>
          <div className="tiles" style={{ marginTop: 12 }}>
            {EXAMPLE.map((m) => (
              <div className="tile" key={m.name}>
                <div className="name"><span className="chip" style={{ background: m.color }} />{m.name}</div>
                <div className="val num">{m.value}</div>
                <div className="small muted num">{m.oz}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="import-band" aria-labelledby="import-title">
        <div className="import-copy">
          <p className="eyebrow">Bring your spreadsheet</p>
          <h2 id="import-title" className="display">Your stack, imported in seconds. Any format.</h2>
          <p className="lede">
            No retyping years of purchases. Upload the sheet you already keep, from Excel, Google Sheets or a CSV,
            or just paste it in. {SITE_NAME} reads it the way you wrote it: it finds the dates, the metal, the weight,
            the purity and what you paid, even with no column names or ones like &ldquo;Amt&rdquo; and &ldquo;Wt&rdquo;.
          </p>
          <ul className="import-points">
            <li><strong>Any layout.</strong> Columns in any order, title rows, totals rows, blank rows.</li>
            <li><strong>Knows the coins.</strong> &ldquo;Tube of 25 Silver Eagles&rdquo;, &ldquo;$10 face junk&rdquo;, &ldquo;1/10 oz Gold Eagle&rdquo; and Krugerrands are weighed correctly.</li>
            <li><strong>Any style.</strong> 3/15/2024 or 15/03/2024, $1,950.00 or 1.950,00, oz, grams, kilos, 14k or .999.</li>
            <li><strong>You check first.</strong> See every row before anything is saved, and fix any column with one click.</li>
          </ul>
          <div className="hero-actions">
            <Link className="button-link primary" href="/demo">Try importing in the demo</Link>
            <a className="button-link" href="#get-started">Create a free account</a>
          </div>
        </div>

        <div className="import-visual" aria-label="Example: a messy spreadsheet becomes tracked purchases">
          <div className="sheet small num" aria-hidden="true">
            <div className="sheet-row sheet-title">my stack 2024</div>
            <div className="sheet-row"><span>Thing</span><span>Wt</span><span>Amt</span><span>When</span></div>
            <div className="sheet-row"><span>Silver Eagle x20</span><span>1 oz</span><span>$625</span><span>4/2/24</span></div>
            <div className="sheet-row"><span>Krugerrand</span><span></span><span>$1,950</span><span>3/15/24</span></div>
            <div className="sheet-row"><span>14k chain</span><span>12.5 g</span><span>$420</span><span>Aug 2021</span></div>
            <div className="sheet-row sheet-total"><span>TOTAL</span><span></span><span>$2,995</span><span></span></div>
          </div>
          <div className="import-arrow" aria-hidden="true">↓</div>
          <div className="import-result">
            <div className="small"><strong>3 ready to import</strong> · 1 totals row skipped</div>
            <ul className="small num">
              <li><span className="chip" style={{ background: "var(--ag)" }} />20 × Silver Eagle · 19.98 oz silver</li>
              <li><span className="chip" style={{ background: "var(--au)" }} />Krugerrand · 1.000 oz gold</li>
              <li><span className="chip" style={{ background: "var(--au)" }} />14k chain · 0.235 oz gold</li>
            </ul>
          </div>
        </div>
      </section>

      <WhereToBuy variant="public" />

      <section className="features">
        <div className="feature">
          <h3>Six metals, priced every 10 minutes</h3>
          <p>Gold, silver, platinum, palladium, rhodium and copper, updated automatically from a live market feed.</p>
        </div>
        <div className="feature">
          <h3>Real purity math</h3>
          <p>Pick 22k, sterling, 90% coin silver or any grade, or a preset like a Gold Eagle or Krugerrand. It counts only the fine metal.</p>
        </div>
        <div className="feature">
          <h3>Spot price on the day you bought</h3>
          <p>Back-dated purchases are matched to that day&apos;s recorded spot price, so you can see the premium you paid.</p>
        </div>
        <div className="feature">
          <h3>Private to you</h3>
          <p>Your purchases are visible only to your account. You can delete your account and data at any time.</p>
        </div>
      </section>

      <section className="signup">
        <div>
          <h2>Start tracking your stack</h2>
          <p className="muted">Free to use. Works on your phone, too: open the site and add it to your home screen.</p>
          <p className="small" style={{ marginTop: 8 }}>Not ready? <Link href="/demo">Try the demo first</Link>, no account needed.</p>
        </div>
        <Auth />
      </section>

      <Footer />
    </main>
  );
}
