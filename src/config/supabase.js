// src/config/supabase.js
// Supabase configuration and client initialization.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- SUPABASE PROJECT URL AND ANON KEY ---
export const SUPABASE_URL = 'https://uebjprtwmkqugjmcugdt.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYmpwcnR3bWtxdWdqbWN1Z2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDM2NzYsImV4cCI6MjA2ODQxOTY3Nn0.M0fz-1-Z32EtHnBDTtaqaMekUVdUjD49K9YoCgKCQ48';
// -------------------------------------------------------------------

/**
 * Initializes Supabase client.
 * @returns {object} The Supabase client instance.
 */
export function initializeSupabaseClient() {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("[DEBUG] Supabase client initialized.");
        return supabase;
    } catch (error) {
        console.error("[ERROR] Error initializing Supabase client:", error);
        throw error;
    }
}