// Bulk-import students from a CSV (columns: name[,phone][,group]).
// Run locally, never in the browser — uses the service role key.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-students.mjs students.csv
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [,, file] = process.argv;
if (!file) { console.error("usage: node scripts/import-students.mjs students.csv"); process.exit(1); }
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
const hasHeader = header.includes("name");
const idx = (k) => (hasHeader ? header.indexOf(k) : -1);
const rows = (hasHeader ? lines.slice(1) : lines).map((l) => {
  const c = l.split(",").map((x) => x.trim());
  return {
    name: c[idx("name") >= 0 ? idx("name") : 0],
    phone: idx("phone") >= 0 ? c[idx("phone")] || null : c[1] || null,
    group_name: idx("group") >= 0 ? c[idx("group")] || null : c[2] || null,
  };
}).filter((r) => r.name);

const sb = createClient(url, key);
const { data, error } = await sb.from("students").insert(rows).select("name, qr_token");
if (error) { console.error(error); process.exit(1); }
console.log(`Inserted ${data.length} students`);
for (const s of data) console.log(`${s.qr_token}\t${s.name}`);
