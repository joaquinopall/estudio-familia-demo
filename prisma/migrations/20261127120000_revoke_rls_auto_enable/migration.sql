-- Least privilege on Supabase's public.rls_auto_enable() (F5-02, SECURITY_REVIEW.md H4).
--
-- Supabase creates this SECURITY DEFINER function when "Automatically enable RLS for new
-- tables" is turned on at project creation: an event trigger that enables RLS on every new
-- table in public. It is not ours, but it lives in public, so the Data API exposes it as
-- /rest/v1/rpc/rls_auto_enable and anon and authenticated can execute it (Security Advisor
-- lints 0028 and 0029).
--
-- The trigger is kept (defense in depth on top of prisma/__tests__/rls.test.ts); only EXECUTE
-- is revoked. Event triggers are fired by Postgres, not by these roles, so it keeps working.
-- Guarded: the function does not exist in a project without that option, nor in the shadow
-- database of `migrate dev` (where anon and authenticated do not exist either).

DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
    END IF;
  END IF;
END
$$;
