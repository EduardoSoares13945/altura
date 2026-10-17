begin;

alter table public.notificacao
  drop constraint if exists notificacao_tipo_valido;

alter table public.notificacao
  add constraint notificacao_tipo_valido check (
    tipo in ('conexao', 'status_conexao', 'mensagem', 'curtida', 'comentario', 'proposta', 'rodada')
  );

create table if not exists public.proposta (
  id bigint generated always as identity primary key,
  match_id bigint not null references public.match(id) on delete cascade,
  autor_usuario_id uuid not null references public.usuario(id) on delete cascade,
  valor numeric(15,2) not null,
  mensagem varchar(500),
  status varchar(20) not null default 'pendente',
  respondida_em timestamptz,
  created_at timestamptz not null default now(),
  constraint proposta_valor_positivo check (valor > 0),
  constraint proposta_mensagem_tamanho check (
    mensagem is null or char_length(btrim(mensagem)) between 1 and 500
  ),
  constraint proposta_status_valido check (
    status in ('pendente', 'aceita', 'recusada', 'cancelada', 'substituida')
  )
);

create index if not exists proposta_match_data_idx
  on public.proposta (match_id, created_at, id);

create unique index if not exists proposta_match_pendente_unique_idx
  on public.proposta (match_id)
  where status = 'pendente';

insert into public.proposta (match_id, autor_usuario_id, valor, mensagem, status, created_at)
select m.id, m.solicitante_usuario_id, m.valor_proposto, m.mensagem_inicial,
       case when m.status = 'recusado' then 'recusada' else 'pendente' end,
       m.created_at
from public.match m
where m.valor_proposto is not null
  and not exists (select 1 from public.proposta p where p.match_id = m.id);

commit;
