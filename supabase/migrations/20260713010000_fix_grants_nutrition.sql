-- Add missing GRANTs for nutrition_logs and nutrition_plans tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_logs TO authenticated;
GRANT ALL ON public.nutrition_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.nutrition_plans TO service_role;
