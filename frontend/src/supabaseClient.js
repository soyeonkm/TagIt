import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bxkfqxgiinsxdhsscdqn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4a2ZxeGdpaW5zeGRoc3NjZHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NzgwODQsImV4cCI6MjA2NjI1NDA4NH0.qJoHgeyvqkOD54lgJQfRIED_i4k3wuFFqn0xa_u_GW4'
export const supabase = createClient(supabaseUrl, supabaseKey) 