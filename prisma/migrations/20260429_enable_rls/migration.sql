-- Enable Row Level Security on both tables so the Supabase REST API
-- (which uses the anon/service_role keys) cannot read, write, or delete rows.
-- Prisma connects as the postgres superuser via the direct URL and bypasses
-- RLS automatically, so the application is unaffected.

ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Guest"   ENABLE ROW LEVEL SECURITY;

-- No POLICY is added intentionally: with RLS enabled and no permissive policy,
-- all access via the Supabase API is denied by default. The postgres superuser
-- (Prisma) is exempt from RLS and retains full access.
