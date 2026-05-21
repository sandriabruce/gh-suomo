
create table if not exists public.subscription_renewal_reminders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null,
  days_before int not null check (days_before in (7,3,1,0)),
  expires_at timestamptz not null,
  sent_at timestamptz not null default now(),
  unique (subscription_id, days_before, expires_at)
);

alter table public.subscription_renewal_reminders enable row level security;

create policy "Admins manage renewal reminders"
on public.subscription_renewal_reminders
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  existing_jobid bigint;
begin
  select jobid into existing_jobid from cron.job where jobname = 'send-renewal-reminders-daily';
  if existing_jobid is not null then
    perform cron.unschedule(existing_jobid);
  end if;
end $$;

select cron.schedule(
  'send-renewal-reminders-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://dudzxsnrybsgezodylwf.supabase.co/functions/v1/send-renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZHp4c25yeWJzZ2V6b2R5bHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTc4NDQsImV4cCI6MjA5Mjg3Mzg0NH0.jk1viQpF2WxlHOIUAsXEFqVXiOkMA1imC4P0_dBQTvY'
    ),
    body := jsonb_build_object('scheduled_at', now())
  );
  $$
);
