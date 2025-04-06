import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bcaeugxhaokrankuwtsa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYWV1Z3hoYW9rcmFua3V3dHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMjA0NTksImV4cCI6MjA1Nzc5NjQ1OX0.3YJB_NLsvIl2fF_EGivT2I8N26TXyirpVnX06BPRbg4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
