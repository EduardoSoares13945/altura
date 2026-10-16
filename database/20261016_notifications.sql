-- notificacoes de interacoes entre perfis
-- Execute uma vez no SQL Editor do Neon.

begin;

create table if not exists public.notificacao (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  ator_usuario_id uuid not null references public.usuario(id) on delete cascade,
  tipo varchar(30) not null,
  referencia_id bigint not null,
  titulo varchar(100) not null,
  mensagem varchar(300) not null,
  destino varchar(300) not null,
  lida_em timestamptz,
  created_at timestamptz not null default now(),
  constraint notificacao_usuarios_distintos check (usuario_id <> ator_usuario_id),
  constraint notificacao_tipo_valido check (
    tipo in ('conexao', 'status_conexao', 'mensagem', 'curtida', 'comentario')
  ),
  constraint notificacao_destino_interno check (destino like '/%'),
  constraint notificacao_texto_preenchido check (
    char_length(btrim(titulo)) between 1 and 100
    and char_length(btrim(mensagem)) between 1 and 300
  ),
  unique (usuario_id, ator_usuario_id, tipo, referencia_id)
);

create index if not exists notificacao_usuario_data_idx
  on public.notificacao (usuario_id, created_at desc, id desc);

create index if not exists notificacao_nao_lida_idx
  on public.notificacao (usuario_id, created_at desc)
  where lida_em is null;

commit;

