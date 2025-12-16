/**
 * Supabase Client Initialization
 * 
 * Purpose:
 * - Authentication (Sign up, Login, Session management)
 * - Replication handshakes with Supabase backend
 * 
 * Note:
 * RxDB handles the main data flow (Local-First).
 * Supabase is used for:
 * 1. User authentication
 * 2. Cloud sync/replication coordination
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables (must be set in .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

/**
 * Supabase Client Instance
 * 
 * Features:
 * - Auto-refresh tokens
 * - Persistent sessions (localStorage)
 * - Type-safe queries (with Database types)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Helper: Get current authenticated user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Failed to get current user:', error);
    return null;
  }

  return user;
}

/**
 * Helper: Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
}

/**
 * Helper: Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
