-- localizacao do perfil de investidor
-- Migration aditiva e compatível com perfis criados antes deste recurso.

begin;

alter table public.investidor
  add column if not exists localizacao varchar(120),
  add column if not exists cidade varchar(100),
  add column if not exists estado char(2),
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'investidor_estado_formato'
      and conrelid = 'public.investidor'::regclass
  ) then
    alter table public.investidor
      add constraint investidor_estado_formato check (
        estado is null or estado in (
          'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
          'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'investidor_latitude_valida'
      and conrelid = 'public.investidor'::regclass
  ) then
    alter table public.investidor
      add constraint investidor_latitude_valida check (
        latitude is null or latitude between -90 and 90
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'investidor_longitude_valida'
      and conrelid = 'public.investidor'::regclass
  ) then
    alter table public.investidor
      add constraint investidor_longitude_valida check (
        longitude is null or longitude between -180 and 180
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'investidor_coordenadas_completas'
      and conrelid = 'public.investidor'::regclass
  ) then
    alter table public.investidor
      add constraint investidor_coordenadas_completas check (
        (latitude is null and longitude is null)
        or (latitude is not null and longitude is not null)
      );
  end if;
end
$$;

comment on column public.investidor.cidade is
  'Cidade informada ou confirmada pelo investidor.';

comment on column public.investidor.estado is
  'UF brasileira informada ou confirmada pelo investidor.';

commit;
