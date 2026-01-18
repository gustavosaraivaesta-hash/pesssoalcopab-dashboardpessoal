-- Drop existing type (cleaning up from failed migration)
DROP TYPE IF EXISTS public.app_role_new;

-- Step 1: Drop dependent objects first
DROP POLICY IF EXISTS "COPAB users can manage all roles" ON public.user_roles;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Step 2: Create new enum with all OMs
CREATE TYPE public.app_role_new AS ENUM (
  'COPAB',
  'CSUPAB',
  'BAMRJ',
  'CMM',
  'DEPCMRJ',
  'CDAM',
  'DEPSMRJ',
  'DEPSIMRJ',
  'DEPMSMRJ',
  'DEPFMRJ',
  'CDU-BAMRJ',
  'CDU-1DN'
);

-- Step 3: Alter the table to use the new enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role_new 
  USING role::text::public.app_role_new;

-- Step 4: Drop the old enum
DROP TYPE public.app_role;

-- Step 5: Rename new enum to original name
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 6: Recreate the functions with the updated enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Step 7: Recreate RLS policy for COPAB users (permissive)
CREATE POLICY "COPAB users can manage all roles" 
ON public.user_roles 
FOR ALL
USING (has_role(auth.uid(), 'COPAB'::app_role))
WITH CHECK (has_role(auth.uid(), 'COPAB'::app_role));