import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { supabase } from './client';

const EXTERNAL_SUPABASE_URL = 'https://bjfvmgymyfwgbzntcigj.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZnZtZ3lteWZ3Z2J6bnRjaWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzYyOTUsImV4cCI6MjA5Mjk1MjI5NX0.kV3R4oy8x404FopQBGmCcc7p-6as7vVjzxYEo3nxXvs';

/**
 * External Supabase client pointing to bjfvmgymyfwgbzntcigj.
 * We forward the user's JWT from the primary project so RLS auth.uid() works.
 */
const _seedClient = createClient<Database>(
  EXTERNAL_SUPABASE_URL,
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'sb-external-seed-auth',
    },
  }
);

// Forward the active session JWT from the primary client to the seed client
// so that RLS policies (auth.uid() = user_a etc.) work correctly.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    _seedClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? '',
    });
  }
});

// Also set the session immediately if one already exists.
supabase.auth.getSession().then(({ data }) => {
  if (data.session?.access_token) {
    _seedClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token ?? '',
    });
  }
});

export const seedClient = _seedClient;
export const externalClient = _seedClient;