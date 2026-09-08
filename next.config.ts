import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The whole app is client-side (Supabase does the backend), so it also works as a
  // static export on PHP-only hosting: set output: "export" and upload the `out/` folder.
  // output: "export",
  reactStrictMode: true,
};

export default nextConfig;
