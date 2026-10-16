-- imagens de perfil para startups e investidores
-- Imagens são redimensionadas e comprimidas no frontend antes de serem persistidas.

begin;

alter table public.startup
  add column if not exists imagem_perfil text;

alter table public.investidor
  add column if not exists imagem_perfil text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'startup_imagem_perfil_valida'
      and conrelid = 'public.startup'::regclass
  ) then
    alter table public.startup
      add constraint startup_imagem_perfil_valida check (
        imagem_perfil is null or (
          char_length(imagem_perfil) <= 500000
          and imagem_perfil ~ '^data:image/(jpeg|png|webp);base64,'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'investidor_imagem_perfil_valida'
      and conrelid = 'public.investidor'::regclass
  ) then
    alter table public.investidor
      add constraint investidor_imagem_perfil_valida check (
        imagem_perfil is null or (
          char_length(imagem_perfil) <= 500000
          and imagem_perfil ~ '^data:image/(jpeg|png|webp);base64,'
        )
      );
  end if;
end
$$;

comment on column public.startup.imagem_perfil is
  'Imagem quadrada comprimida em data URL (JPG, PNG ou WebP).';

comment on column public.investidor.imagem_perfil is
  'Imagem quadrada comprimida em data URL (JPG, PNG ou WebP).';

commit;
