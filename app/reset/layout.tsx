import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set a new password · Track My Stack", robots: { index: false } };

export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
