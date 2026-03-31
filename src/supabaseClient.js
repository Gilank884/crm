import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
    "https://pyvteymevkdzazadqdgo.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dnRleW1ldmtkemF6YWRxZGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjM5NDQsImV4cCI6MjA5MDUzOTk0NH0.Tdm6Zekm_R7xaGzs5BMr5PiDfZwk1Bu9xO2a83PkLYU"
);
