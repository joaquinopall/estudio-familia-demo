-- Row Level Security on every table of the public schema (NFR-SEC-03, ADR-0002, SPEC §7).
--
-- RLS is enabled WITHOUT policies on purpose: the Supabase Data API (anon and authenticated
-- roles) can neither read nor write these tables. Prisma connects as the table owner, which
-- RLS does not restrict, and authorization lives in the code (requireStaff()).
--
-- _prisma_migrations is created by Prisma in public, so the Data API would expose it too.
-- It exists in every real database (Prisma creates it before applying migrations), but not in
-- the shadow database that `migrate dev` uses to replay migrations, hence the guard.
--
-- Every new table needs the same line in its migration (checked by prisma/__tests__/rls.test.ts).

ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inquiry_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_members" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
