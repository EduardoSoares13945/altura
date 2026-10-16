begin;

alter table public.investidor
  drop constraint if exists investidor_ticket_min_nonnegative,
  drop constraint if exists investidor_ticket_max_nonnegative,
  drop constraint if exists investidor_ticket_valido,
  drop constraint if exists investidor_ticket_min_check,
  drop constraint if exists investidor_ticket_max_check;

alter table public.investidor
  drop column if exists ticket_min,
  drop column if exists ticket_max;

commit;
