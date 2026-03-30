import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://api.mymantl.app'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmam9iaGtvZmZ0dm1sdW9jeHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDc3OTAsImV4cCI6MjA4NjkyMzc5MH0.RJVceNeBCmQLeFD35JKJxNqFuoDF4xXas7A2GCg1LwQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
  }
})
