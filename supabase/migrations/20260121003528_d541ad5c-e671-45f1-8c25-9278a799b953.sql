-- Create table for additional OM access (beyond the user's primary role)
CREATE TABLE public.user_additional_oms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    om TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, om)
);

-- Enable RLS
ALTER TABLE public.user_additional_oms ENABLE ROW LEVEL SECURITY;

-- Only COPAB can manage additional OMs
CREATE POLICY "COPAB users can manage additional OMs"
ON public.user_additional_oms
FOR ALL
USING (has_role(auth.uid(), 'COPAB'::app_role))
WITH CHECK (has_role(auth.uid(), 'COPAB'::app_role));

-- Users can view their own additional OMs
CREATE POLICY "Users can view their own additional OMs"
ON public.user_additional_oms
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to get all OMs a user can access (primary role + additional OMs)
CREATE OR REPLACE FUNCTION public.get_user_allowed_oms(_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  primary_role text;
  additional_oms text[];
  result text[];
BEGIN
  -- Get primary role
  SELECT role::text INTO primary_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  -- Get additional OMs
  SELECT ARRAY_AGG(om) INTO additional_oms
  FROM public.user_additional_oms
  WHERE user_id = _user_id;
  
  -- Start with primary role if exists
  IF primary_role IS NOT NULL THEN
    result := ARRAY[primary_role];
  ELSE
    result := ARRAY[]::text[];
  END IF;
  
  -- Add additional OMs
  IF additional_oms IS NOT NULL THEN
    result := result || additional_oms;
  END IF;
  
  RETURN result;
END;
$$;