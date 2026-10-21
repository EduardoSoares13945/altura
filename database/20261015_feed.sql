-- modulo de feed
-- Execute uma vez no SQL Editor do Neon se altura_schema.sql ja foi aplicado.

begin;

create table if not exists public.postagem (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  conteudo varchar(1500) not null,
  categoria varchar(20) not null,
  metrica_rotulo varchar(40),
  metrica_valor varchar(80),
  created_at timestamptz not null default now(),
  constraint postagem_conteudo_tamanho check (
    char_length(btrim(conteudo)) between 3 and 1500
  ),
  constraint postagem_categoria_valida check (
    categoria in ('atualizacao', 'conquista', 'rodada', 'insight')
  ),
  constraint postagem_metrica_completa check (
    (metrica_rotulo is null and metrica_valor is null)
    or (metrica_rotulo is not null and metrica_valor is not null
        and char_length(btrim(metrica_rotulo)) between 1 and 40
        and char_length(btrim(metrica_valor)) between 1 and 80)
  )
);

create index if not exists postagem_feed_idx
  on public.postagem (created_at desc, id desc);

create index if not exists postagem_usuario_idx
  on public.postagem (usuario_id, created_at desc);

create table if not exists public.postagem_curtida (
  postagem_id bigint not null references public.postagem(id) on delete cascade,
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (postagem_id, usuario_id)
);

create index if not exists postagem_curtida_usuario_idx
  on public.postagem_curtida (usuario_id);

create table if not exists public.postagem_comentario (
  id bigint generated always as identity primary key,
  postagem_id bigint not null references public.postagem(id) on delete cascade,
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  conteudo varchar(500) not null,
  created_at timestamptz not null default now(),
  constraint postagem_comentario_conteudo_tamanho check (
    char_length(btrim(conteudo)) between 1 and 500
  )
);

create index if not exists postagem_comentario_post_idx
  on public.postagem_comentario (postagem_id, created_at, id);

create index if not exists postagem_comentario_usuario_idx
  on public.postagem_comentario (usuario_id);

comment on table public.postagem is
  'Publicacoes do feed da rede, visiveis somente para membros autenticados.';

commit;
