
REVOKE EXECUTE ON FUNCTION public.create_seed_matches_for_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_accept_seed_matches() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_ban_reported_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_seed_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
