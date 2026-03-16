import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rfyavjpuqoepfkxhtzie.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmeWF2anB1cW9lcGZreGh0emllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Njg1NDYsImV4cCI6MjA3MzQ0NDU0Nn0.pnW2RgIQj0G-CbY3neYc7zciAHrOHxyF8U7edlrwj1U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
