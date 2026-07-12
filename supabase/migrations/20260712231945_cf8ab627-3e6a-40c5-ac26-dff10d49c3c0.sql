
-- Fix search_path for trigger functions and restrict EXECUTE
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.tg_touch_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Storage RLS for progress-media (user folder = auth.uid())
CREATE POLICY "media_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'progress-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'progress-media' AND (storage.foldername(name))[1] = auth.uid()::text);
