import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * External Supabase project used as the source of truth for seed profiles,
 * matches and messages. Auth still lives in the primary project — this client
 * is unauthenticated (anon) against the external project, so any table it
 * touches must be readable by the anon role (or exposed via a public view).
 */
const EXTERNAL_SUPABASE_URL = 'https://bjfvmgymyfwgbzntcigj.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZnZtZ3lteWZ3Z2J6bnRjaWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzYyOTUsImV4cCI6MjA5Mjk1MjI5NX0.kV3R4oy8x404FopQBGmCcc7p-6as7vVjzxYEo3nxXvs';

export const seedClient = createClient<Database>(
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

export const externalClient = seedClient;