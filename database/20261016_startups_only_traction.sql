-- Consolida o produto em uma única categoria de startup.
-- Execute uma vez no SQL Editor do Neon.

begin;

update public.startup
set fase = 'Tração',
    updated_at = now()
where fase is distinct from 'Tração';

alter table public.startup
  drop constraint if exists startup_fase_traction_only;

alter table public.startup
  alter column fase set default 'Tração';

alter table public.startup
  add constraint startup_fase_traction_only check (fase = 'Tração');

drop index if exists public.startup_fase_idx;

commit;
