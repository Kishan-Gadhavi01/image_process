// File: config.js
const SUPABASE_URL = 'https://sdesjarrpzygdjtwhbrt.supabase.co';    // <-- Replace this
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZXNqYXJycHp5Z2RqdHdoYnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxOTA2OTMsImV4cCI6MjA3Nzc2NjY5M30.rOc2Si2I9uPmjsWpNfYsf3qbYgMDkoMc2hziRH69tig'; // <-- Replace this

export const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);