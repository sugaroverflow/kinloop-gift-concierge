-- Seed data for Kinloop.
-- Replace sugaroverflow+bdw-owner@gmail.com with SUPABASE_TEST_EMAIL before running in Supabase SQL Editor.
-- This file intentionally contains no real addresses, private messages, payment data, or secrets.

insert into public.profiles (id, email, display_name)
select id, email, 'Kinloop'
from auth.users
where email = 'sugaroverflow+bdw-owner@gmail.com'
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name;

insert into public.people (
  id,
  user_id,
  slug,
  name,
  relation,
  birthday,
  budget_min,
  budget_max,
  address_status,
  notes,
  likes,
  avoid
) values (
  '10000000-0000-4000-8000-000000000001',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  'sarah',
  'Sarah Chen',
  'Close friend',
  '2026-06-02',
  40,
  75,
  'ready',
  'Thoughtful and useful, but not extravagant.',
  array['Pottery classes', 'Espresso', 'Cozy hosting'],
  array['Generic mugs', 'Fitness gifts']
)
on conflict (id) do update set
  user_id = excluded.user_id,
  slug = excluded.slug,
  name = excluded.name,
  relation = excluded.relation,
  birthday = excluded.birthday,
  budget_min = excluded.budget_min,
  budget_max = excluded.budget_max,
  address_status = excluded.address_status,
  notes = excluded.notes,
  likes = excluded.likes,
  avoid = excluded.avoid;

insert into public.source_signals (
  id,
  user_id,
  person_id,
  source_type,
  source_label,
  summary,
  evidence_strength
) values
(
  '30000000-0000-4000-8000-000000000001',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '10000000-0000-4000-8000-000000000001',
  'conversation_summary',
  'Pottery note',
  'Sarah has mentioned wanting to try a pottery class more than once.',
  'strong'
),
(
  '30000000-0000-4000-8000-000000000002',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '10000000-0000-4000-8000-000000000001',
  'preference_summary',
  'Coffee note',
  'Espresso comes up often when choosing cafes or hosting at home.',
  'medium'
),
(
  '30000000-0000-4000-8000-000000000003',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '10000000-0000-4000-8000-000000000001',
  'relationship_summary',
  'Hosting note',
  'Sarah likes having friends over and prefers warm, practical objects.',
  'medium'
)
on conflict (id) do update set
  user_id = excluded.user_id,
  person_id = excluded.person_id,
  source_type = excluded.source_type,
  source_label = excluded.source_label,
  summary = excluded.summary,
  evidence_strength = excluded.evidence_strength;

insert into public.gift_briefs (
  id,
  user_id,
  person_id,
  status,
  budget_label,
  delivery_deadline,
  generation_mode
) values (
  '20000000-0000-4000-8000-000000000001',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '10000000-0000-4000-8000-000000000001',
  'ready',
  'GBP 40-75',
  '2026-06-02',
  'local_resilience'
)
on conflict (id) do update set
  user_id = excluded.user_id,
  person_id = excluded.person_id,
  status = excluded.status,
  budget_label = excluded.budget_label,
  delivery_deadline = excluded.delivery_deadline,
  generation_mode = excluded.generation_mode;

insert into public.gift_options (
  id,
  user_id,
  brief_id,
  catalog_id,
  name,
  seller,
  price_cents,
  currency,
  delivery_label,
  fit_score,
  evidence_signal_ids,
  risk_note
) values
(
  '40000000-0000-4000-8000-000000000001',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '20000000-0000-4000-8000-000000000001',
  'pottery-voucher',
  'Pottery Studio Voucher',
  'Clay North Studio',
  5800,
  'GBP',
  'Digital delivery today',
  89,
  array['30000000-0000-4000-8000-000000000001'::uuid],
  'Less tactile than a wrapped item.'
),
(
  '40000000-0000-4000-8000-000000000002',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '20000000-0000-4000-8000-000000000001',
  'espresso-kit',
  'Espresso Tasting Kit',
  'Tarra Coffee Co.',
  6400,
  'GBP',
  'Arrives by May 30',
  82,
  array['30000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000003'::uuid],
  'May overlap with something she already buys.'
),
(
  '40000000-0000-4000-8000-000000000003',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '20000000-0000-4000-8000-000000000001',
  'hosting-care',
  'Cozy Hosting Bundle',
  'Hearth & Table',
  4600,
  'GBP',
  'Arrives by May 31',
  74,
  array['30000000-0000-4000-8000-000000000003'::uuid],
  'Could feel a little generic.'
)
on conflict (id) do update set
  user_id = excluded.user_id,
  brief_id = excluded.brief_id,
  catalog_id = excluded.catalog_id,
  name = excluded.name,
  seller = excluded.seller,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  delivery_label = excluded.delivery_label,
  fit_score = excluded.fit_score,
  evidence_signal_ids = excluded.evidence_signal_ids,
  risk_note = excluded.risk_note;

insert into public.reminders (
  id,
  user_id,
  person_id,
  state,
  due_at,
  channel
) values (
  '50000000-0000-4000-8000-000000000001',
  (select id from auth.users where email = 'sugaroverflow+bdw-owner@gmail.com'),
  '10000000-0000-4000-8000-000000000001',
  'brief_ready',
  '2026-05-26T12:00:00Z',
  'web'
)
on conflict (id) do update set
  user_id = excluded.user_id,
  person_id = excluded.person_id,
  state = excluded.state,
  due_at = excluded.due_at,
  channel = excluded.channel;

select
  '20000000-0000-4000-8000-000000000001' as supabase_test_brief_id,
  '40000000-0000-4000-8000-000000000001' as supabase_test_gift_option_id;
