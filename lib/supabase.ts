"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export type Student = {
  id: number;
  name: string;
  phone: string | null;
  group_name: string | null;
  qr_token: string;
  created_at: string;
};

export type AttendanceRow = {
  id: number;
  session_date: string; // YYYY-MM-DD (Cairo)
  session_no: 1 | 2;
  scanned_at: string; // ISO, UTC
  student: { id: number; name: string; group_name: string | null } | null;
};

export type ScanResult = {
  status: "recorded" | "duplicate" | "unknown";
  student_name: string | null;
  scanned_at: string | null;
};
