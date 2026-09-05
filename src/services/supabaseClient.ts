import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Normalizes input Supabase URL:
 * - If user enters bare project ref (e.g. "difvcmrqytgjikftfjqp"), expands to "https://<ref>.supabase.co"
 * - If user enters domain without protocol (e.g. "my-project.supabase.co"), prepends "https://"
 * - Strips accidental quotes or trailing slashes
 * - Returns placeholder URL if invalid or empty to prevent crash
 */
function normalizeSupabaseUrl(input?: string): string {
  let val = String(input || '').trim();
  if (!val) return 'https://placeholder.supabase.co';

  // Remove surrounding quotes if any
  val = val.replace(/^["']|["']$/g, '').trim();

  // If user entered only project reference (e.g. 20-character slug like "difvcmrqytgjikftfjqp" without dots)
  if (/^[a-z0-9_-]{10,}$/i.test(val) && !val.includes('.')) {
    val = `https://${val}.supabase.co`;
  } else if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = `https://${val}`;
  }

  try {
    const parsed = new URL(val);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch {
    return 'https://placeholder.supabase.co';
  }

  return 'https://placeholder.supabase.co';
}

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const supabaseAnonKey = (rawKey || 'placeholder-anon-key').replace(/^["']|["']$/g, '').trim();

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-anon-key'
);

/**
 * Custom fetch wrapper to forward the active CBT session token in 'x-cbt-token' HTTP header.
 * Supabase PostgreSQL functions extract this header to enforce Row-Level Security (RLS) policies.
 */
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  if (typeof window !== 'undefined') {
    try {
      const activeToken = localStorage.getItem('lms_token') || '';
      if (activeToken && !headers.has('x-cbt-token')) {
        headers.set('x-cbt-token', activeToken);
      }
    } catch {}
  }
  return fetch(url, { ...options, headers });
};

let client: SupabaseClient;
try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    global: {
      fetch: customFetch
    }
  });
} catch (err) {
  console.warn('Gagal menginisialisasi Supabase client, fallback ke safe client:', err);
  client = createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export const supabase = client;

