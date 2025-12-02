import { createClient } from '@supabase/supabase-js';

// On met des valeurs fictives car on utilise ton PC localement
const SUPABASE_URL = "https://placeholder.supabase.co";
const SUPABASE_KEY = "placeholder";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);