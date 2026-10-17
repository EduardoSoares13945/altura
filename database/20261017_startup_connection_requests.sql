alter table public.match
  add column if not exists solicitante_usuario_id uuid;

update public.match m
set solicitante_usuario_id = u.id
from public.investidor i
join public.usuario u on u.id = i.usuario_id
where m.investidor_id = i.id
  and m.solicitante_usuario_id is null;

alter table public.match
  alter column solicitante_usuario_id set not null;

alter table public.match
  drop constraint if exists match_solicitante_usuario_fk;

alter table public.match
  add constraint match_solicitante_usuario_fk
  foreign key (solicitante_usuario_id) references public.usuario(id) on delete cascade;

create index if not exists match_solicitante_usuario_idx
  on public.match (solicitante_usuario_id);
