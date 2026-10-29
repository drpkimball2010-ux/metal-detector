import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Demo · ${SITE_NAME}`,
  description: "Try Track My Stack with a sample stack at live spot prices. No account needed.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
