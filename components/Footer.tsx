import Link from "next/link";
import { CONTACT_EMAIL, DISCLOSURE_SHORT, SITE_NAME } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="footer">
      <nav className="footer-links" aria-label="Site">
        <Link href="/">Home</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Terms of Use</Link>
        <Link href="/disclosure">Affiliate Disclosure</Link>
        <span>Contact: <span className="sel">{CONTACT_EMAIL}</span></span>
      </nav>
      <p className="small muted" style={{ margin: 0 }}>
        {DISCLOSURE_SHORT} Prices are for information only and are not financial advice. © {new Date().getFullYear()} {SITE_NAME}.
      </p>
    </footer>
  );
}
