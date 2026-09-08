// Plain JS on purpose — do NOT convert this back to next.config.ts.
// Hostinger's build image has glibc < 2.29, so Next cannot load its native SWC binary and falls
// back to WASM. A TypeScript config has to be compiled by SWC before it can be read, and that
// step fails there ("Cannot find module '<hash>.next.config'"). A .js config is read directly.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The whole app is client-side (Supabase does the backend), so it also works as a
  // static export on PHP-only hosting: set output: "export" and upload the `out/` folder.
  // output: "export",
  reactStrictMode: true,
  // CLAUDE.md is the hand-written brief for this project; `next dev` otherwise appends its own
  // block to it on every run and leaves the tree dirty.
  agentRules: false,
};

module.exports = nextConfig;
