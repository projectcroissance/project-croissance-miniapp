import { createClient } from '@supabase/supabase-js';

// Admin panel uses the SERVICE KEY — full database access, bypasses RLS
// This file must NEVER be used in the member mini app
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_KEY
);

export default supabase;