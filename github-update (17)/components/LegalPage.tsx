import Link from "next/link";
import Footer from "./Footer";
import { SITE_NAME } from "@/lib/site";
import BrandMark from "@/components/BrandMark";

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="wrap">
      <div className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <BrandMark /><span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "1.35rem" }}>{SITE_NAME}</span>
        </Link>
        <Link className="button-link" href="/">Back to the app</Link>
      </div>
      <article className="legal" style={{ display: "grid", gap: 20 }}>
        <header style={{ display: "grid", gap: 4 }}>
          <h1>{title}</h1>
          <p className="small muted" style={{ margin: 0 }}>Last updated {updated}</p>
        </header>
        {children}
      </article>
      <Footer />
    </main>
  );
}
