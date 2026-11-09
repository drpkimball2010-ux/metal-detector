/** @type {import('next').NextConfig} */
// Built as a static site (plain HTML/JS files in "out/"), so it can be hosted anywhere,
// e.g. Cloudflare Pages. Everything dynamic happens in the browser, talking to Supabase.
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
};
export default nextConfig;
