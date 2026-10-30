import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://ipfczdqmbjaiwfrdxupl.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZmN6ZHFtYmphaXdmcmR4dXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTQ0NzksImV4cCI6MjEwODkzMDQ3OX0.LE72vH9ho-XvCARYZCvCTRhMoef9qhzAqlxDElv1cNw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
