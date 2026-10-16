-- conexoes, propostas e mensagens
-- Execute uma vez no SQL Editor do Neon depois de nexo_schema.sql.

begin;

alter table public.match
  add column if not exists mensagem_inicial varchar(500);

update public.match
set mensagem_inicial = 'Interesse registrado antes da ativação do sistema de conversas.'
where mensagem_inicial is null;

alter table public.match
  alter column mensagem_inicial set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_mensagem_inicial_tamanho'
      and conrelid = 'public.match'::regclass
  ) then
    alter table public.match
      add constraint match_mensagem_inicial_tamanho check (
        char_length(btrim(mensagem_inicial)) between 10 and 500
      );
  end if;
end
$$;

create table if not exists public.mensagem (
  id bigint generated always as identity primary key,
  match_id bigint not null references public.match(id) on delete cascade,
  remetente_usuario_id uuid not null references public.usuario(id) on delete cascade,
  conteudo varchar(1000) not null,
  lida_em timestamptz,
  created_at timestamptz not null default now(),
  constraint mensagem_conteudo_tamanho check (
    char_length(btrim(conteudo)) between 1 and 1000
  ),
  constraint mensagem_leitura_valida check (lida_em is null or lida_em >= created_at)
);

create index if not exists mensagem_match_created_idx
  on public.mensagem (match_id, created_at, id);

create index if not exists mensagem_nao_lida_idx
  on public.mensagem (match_id, remetente_usuario_id)
  where lida_em is null;

comment on table public.mensagem is
  'Mensagens trocadas depois que a startup aceita o match.';

commit;
