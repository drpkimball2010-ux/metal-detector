import Auth from "./Auth";
import Footer from "./Footer";
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
        <a className="button-link" href="#signin">Sign in</a>
      </div>

      <section className="hero-landing">
        <div className="hero-copy">
          <p className="eyebrow">Free precious metals tracker</p>
          <h2 className="display">Know what your stack is worth, right now.</h2>
          <p className="lede">
            Log every coin, bar and round you buy. {SITE_NAME} weighs out the fine metal, prices it at live spot,
            and shows your total value and your gain or loss against what you paid.
          </p>
          <a className="button-link primary" href="#get-started">Create a free account</a>
        </div>

        <div className="preview" aria-label="Example of the dashboard">
          <div className="preview-tag small">Example stack</div>
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
        </div>
        <Auth />
      </section>

      <Footer />
    </main>
  );
}
