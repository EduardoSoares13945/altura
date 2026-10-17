begin;

alter table public.investidor
  add column if not exists ticket_min numeric(15,2) not null default 0,
  add column if not exists ticket_max numeric(15,2) not null default 10000000;

alter table public.investidor
  drop constraint if exists investidor_ticket_min_nonnegative,
  drop constraint if exists investidor_ticket_max_positive,
  drop constraint if exists investidor_ticket_range_valid;

alter table public.investidor
  add constraint investidor_ticket_min_nonnegative check (ticket_min >= 0),
  add constraint investidor_ticket_max_positive check (ticket_max > 0),
  add constraint investidor_ticket_range_valid check (ticket_min <= ticket_max);

comment on column public.investidor.ticket_min is
  'Preferencia privada usada apenas no filtro e no calculo de match.';
comment on column public.investidor.ticket_max is
  'Preferencia privada usada apenas no filtro e no calculo de match.';

commit;
