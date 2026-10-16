-- Altura - base do esquema PostgreSQL completo
-- Destino: banco PostgreSQL vazio (por exemplo, Neon SQL Editor).
-- Autenticacao e autorizacao pertencem ao Spring Boot. Este script nao depende
-- de auth.users, auth.uid(), roles ou Row Level Security do Supabase.

begin;

create schema if not exists public;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'tipo_usuario'
  ) then
    create type public.tipo_usuario as enum ('startup', 'investidor');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'status_rodada'
  ) then
    create type public.status_rodada as enum ('aberta', 'encerrada', 'cancelada');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'status_match'
  ) then
    create type public.status_match as enum ('pendente', 'aceito', 'recusado');
  end if;
end
$$;

create table if not exists public.usuario (
  id uuid primary key default gen_random_uuid(),
  email varchar(254) not null,
  password_hash varchar(100) not null,
  nome varchar(100) not null,
  tipo public.tipo_usuario not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuario_email_normalizado check (email = lower(btrim(email))),
  constraint usuario_email_formato check (position('@' in email) > 1),
  constraint usuario_nome_tamanho check (char_length(btrim(nome)) between 2 and 100),
  constraint usuario_password_hash_preenchido check (char_length(btrim(password_hash)) >= 20)
);

create unique index if not exists usuario_email_unique_idx
  on public.usuario (lower(email));

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

-- O Spring deve salvar somente o SHA-256 do refresh token, nunca o token puro.
create table if not exists public.refresh_token (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  replaced_by uuid references public.refresh_token(id) on delete set null,
  constraint refresh_token_hash_hex check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint refresh_token_expiracao_valida check (expires_at > created_at),
  constraint refresh_token_revogacao_valida check (revoked_at is null or revoked_at >= created_at)
);

create index if not exists refresh_token_usuario_idx
  on public.refresh_token (usuario_id);

create index if not exists refresh_token_ativo_idx
  on public.refresh_token (usuario_id, expires_at)
  where revoked_at is null;

create table if not exists public.postagem (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario(id) on delete cascade,
  conteudo varchar(1500) not null,
  categoria varchar(20) not null,
  metrica_rotulo varchar(40),
  metrica_valor varchar(80),
  imagem_chave varchar(500),
  youtube_video_id varchar(11),
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
  ),
  constraint postagem_youtube_video_id_valido check (
    youtube_video_id is null
    or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'
  ),
  constraint postagem_apenas_uma_midia check (
    num_nonnulls(imagem_chave, youtube_video_id) <= 1
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

create table if not exists public.segmento (
  id bigint generated always as identity primary key,
  nome varchar(60) not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint segmento_nome_preenchido check (char_length(btrim(nome)) between 2 and 60)
);

create table if not exists public.startup (
  id bigint generated always as identity primary key,
  usuario_id uuid not null unique references public.usuario(id) on delete cascade,
  segmento_id bigint not null references public.segmento(id),
  nome varchar(100) not null,
  cnpj char(14) not null unique,
  fase varchar(10) not null default 'Tração',
  descricao varchar(500) not null,
  video_pitch_url varchar(500),
  data_fundacao date not null,
  site_url varchar(500),
  linkedin_url varchar(500),
  localizacao varchar(120),
  cidade varchar(100) not null,
  estado char(2) not null,
  latitude double precision,
  longitude double precision,
  imagem_perfil text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_nome_tamanho check (char_length(btrim(nome)) between 2 and 100),
  constraint startup_cnpj_formato check (cnpj ~ '^[0-9]{14}$'),
  constraint startup_fase_traction_only check (fase = 'Tração'),
  constraint startup_descricao_tamanho check (char_length(btrim(descricao)) between 10 and 500),
  constraint startup_estado_formato check (
    estado in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
               'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
  ),
  constraint startup_latitude_valida check (latitude is null or latitude between -90 and 90),
  constraint startup_longitude_valida check (longitude is null or longitude between -180 and 180),
  constraint startup_coordenadas_completas check (
    (latitude is null and longitude is null) or (latitude is not null and longitude is not null)
  ),
  constraint startup_imagem_perfil_valida check (
    imagem_perfil is null or (
      char_length(imagem_perfil) <= 500000
      and imagem_perfil ~ '^data:image/(jpeg|png|webp);base64,'
    )
  )
);

create index if not exists startup_segmento_principal_idx
  on public.startup (segmento_id);

create table if not exists public.startup_segmento (
  startup_id bigint not null references public.startup(id) on delete cascade,
  segmento_id bigint not null references public.segmento(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (startup_id, segmento_id)
);

create index if not exists startup_segmento_segmento_idx
  on public.startup_segmento (segmento_id);

create table if not exists public.startup_metrica (
  id bigint generated always as identity primary key,
  startup_id bigint not null references public.startup(id) on delete cascade,
  mes_referencia date not null,
  receita_mensal numeric(15,2),
  mrr numeric(15,2),
  clientes_ativos integer,
  pilotos_ativos integer,
  crescimento_mensal numeric(7,2),
  evidencia_tracao varchar(500) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_metrica_mes_inicio check (
    mes_referencia = date_trunc('month', mes_referencia)::date
  ),
  constraint startup_metrica_receita_nonnegative check (
    receita_mensal is null or receita_mensal >= 0
  ),
  constraint startup_metrica_mrr_nonnegative check (mrr is null or mrr >= 0),
  constraint startup_metrica_clientes_nonnegative check (
    clientes_ativos is null or clientes_ativos >= 0
  ),
  constraint startup_metrica_pilotos_nonnegative check (
    pilotos_ativos is null or pilotos_ativos >= 0
  ),
  constraint startup_metrica_crescimento_range check (
    crescimento_mensal is null or crescimento_mensal between -100 and 1000
  ),
  constraint startup_metrica_evidencia_length check (
    char_length(btrim(evidencia_tracao)) between 20 and 500
  ),
  constraint startup_metrica_sinal_real check (
    coalesce(receita_mensal, 0) > 0
    or coalesce(mrr, 0) > 0
    or coalesce(clientes_ativos, 0) > 0
    or coalesce(pilotos_ativos, 0) > 0
  ),
  constraint startup_metrica_mes_unique unique (startup_id, mes_referencia)
);

create index if not exists startup_metrica_startup_mes_idx
  on public.startup_metrica (startup_id, mes_referencia desc);

create table if not exists public.captacao (
  id bigint generated always as identity primary key,
  startup_id bigint not null references public.startup(id) on delete cascade,
  valor_alvo numeric(15,2) not null,
  valor_captado numeric(15,2) not null default 0,
  percentual_equity_oferecido numeric(5,2) not null,
  status public.status_rodada not null default 'aberta',
  data_inicio date not null default current_date,
  data_fim date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint captacao_valor_alvo_positivo check (valor_alvo > 0),
  constraint captacao_valor_captado_nonnegative check (valor_captado >= 0),
  constraint captacao_valor_captado_limite check (valor_captado <= valor_alvo),
  constraint captacao_equity_oferecido_maximo check (
    percentual_equity_oferecido between 0.1 and 49.9
  ),
  constraint captacao_datas_validas check (data_fim is null or data_fim >= data_inicio)
);

create index if not exists captacao_startup_idx
  on public.captacao (startup_id);

create index if not exists captacao_aberta_idx
  on public.captacao (data_inicio desc)
  where status = 'aberta';

create table if not exists public.investidor (
  id bigint generated always as identity primary key,
  usuario_id uuid not null unique references public.usuario(id) on delete cascade,
  nome varchar(100) not null,
  cpf char(11) not null unique,
  tipo varchar(30) not null,
  biografia varchar(500) not null,
  linkedin_url varchar(500),
  localizacao varchar(120),
  cidade varchar(100) not null,
  estado char(2) not null,
  latitude double precision,
  longitude double precision,
  imagem_perfil text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investidor_nome_tamanho check (char_length(btrim(nome)) between 2 and 100),
  constraint investidor_cpf_formato check (cpf ~ '^[0-9]{11}$'),
  constraint investidor_tipo_preenchido check (char_length(btrim(tipo)) between 2 and 30),
  constraint investidor_biografia_tamanho check (
    char_length(btrim(biografia)) between 10 and 500
  ),
  constraint investidor_estado_formato check (
    estado in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
               'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
  ),
  constraint investidor_latitude_valida check (latitude is null or latitude between -90 and 90),
  constraint investidor_longitude_valida check (longitude is null or longitude between -180 and 180),
  constraint investidor_coordenadas_completas check (
    (latitude is null and longitude is null) or (latitude is not null and longitude is not null)
  ),
  constraint investidor_imagem_perfil_valida check (
    imagem_perfil is null or (
      char_length(imagem_perfil) <= 500000
      and imagem_perfil ~ '^data:image/(jpeg|png|webp);base64,'
    )
  )
);

create table if not exists public.investidor_segmento (
  investidor_id bigint not null references public.investidor(id) on delete cascade,
  segmento_id bigint not null references public.segmento(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (investidor_id, segmento_id)
);

create index if not exists investidor_segmento_segmento_idx
  on public.investidor_segmento (segmento_id);

create table if not exists public.match (
  id bigint generated always as identity primary key,
  captacao_id bigint not null references public.captacao(id) on delete cascade,
  investidor_id bigint not null references public.investidor(id) on delete cascade,
  status public.status_match not null default 'pendente',
  valor_proposto numeric(15,2),
  mensagem_inicial varchar(500) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_valor_proposto_positivo check (
    valor_proposto is null or valor_proposto > 0
  ),
  constraint match_mensagem_inicial_tamanho check (
    char_length(btrim(mensagem_inicial)) between 10 and 500
  ),
  constraint match_captacao_investidor_unique unique (captacao_id, investidor_id)
);

create index if not exists match_investidor_idx
  on public.match (investidor_id);

create index if not exists match_status_idx
  on public.match (status);

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.validate_startup_dates()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.data_fundacao > current_date then
    raise exception 'A data de fundacao da startup nao pode ser futura.'
      using errcode = '22007';
  end if;
  return new;
end;
$$;

create or replace function public.validate_startup_metric_reference_period()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  current_month date := date_trunc('month', current_date)::date;
  oldest_allowed_month date := (date_trunc('month', current_date) - interval '12 months')::date;
begin
  if new.mes_referencia < oldest_allowed_month then
    raise exception 'O mes de referencia deve estar dentro dos ultimos 12 meses.'
      using errcode = '22007';
  end if;

  if new.mes_referencia > current_month then
    raise exception 'O mes de referencia nao pode ser futuro.'
      using errcode = '22007';
  end if;

  return new;
end;
$$;

drop trigger if exists usuario_set_updated_at on public.usuario;
create trigger usuario_set_updated_at
before update on public.usuario
for each row execute function public.set_updated_at();

drop trigger if exists startup_set_updated_at on public.startup;
create trigger startup_set_updated_at
before update on public.startup
for each row execute function public.set_updated_at();

drop trigger if exists startup_validate_dates on public.startup;
create trigger startup_validate_dates
before insert or update of data_fundacao on public.startup
for each row execute function public.validate_startup_dates();

drop trigger if exists startup_metrica_set_updated_at on public.startup_metrica;
create trigger startup_metrica_set_updated_at
before update on public.startup_metrica
for each row execute function public.set_updated_at();

drop trigger if exists startup_metrica_validate_reference on public.startup_metrica;
create trigger startup_metrica_validate_reference
before insert or update of mes_referencia on public.startup_metrica
for each row execute function public.validate_startup_metric_reference_period();

drop trigger if exists captacao_set_updated_at on public.captacao;
create trigger captacao_set_updated_at
before update on public.captacao
for each row execute function public.set_updated_at();

drop trigger if exists investidor_set_updated_at on public.investidor;
create trigger investidor_set_updated_at
before update on public.investidor
for each row execute function public.set_updated_at();

drop trigger if exists match_set_updated_at on public.match;
create trigger match_set_updated_at
before update on public.match
for each row execute function public.set_updated_at();

insert into public.segmento (nome) values
  ('Finanças'),
  ('Saúde'),
  ('Educação'),
  ('Agricultura'),
  ('Logística'),
  ('Energia e sustentabilidade'),
  ('Alimentação'),
  ('Varejo'),
  ('Governo e impacto social'),
  ('Software e serviços digitais')
on conflict (nome) do nothing;

comment on table public.usuario is
  'Contas autenticadas pelo Spring Boot. password_hash deve conter BCrypt.';
comment on table public.refresh_token is
  'Refresh tokens rotativos. Armazene somente o SHA-256 do token.';
comment on table public.startup_segmento is
  'Segmentos secundarios; o segmento principal fica em startup.segmento_id.';
comment on table public.startup_metrica is
  'Evidencias mensais de tracao, limitadas aos ultimos 12 meses.';
comment on table public.postagem is
  'Publicacoes do feed da rede, visiveis somente para membros autenticados.';
comment on column public.postagem.imagem_chave is
  'Chave do objeto comprimido no Neon Object Storage; nunca armazena os bytes da imagem.';
comment on column public.postagem.youtube_video_id is
  'ID validado de 11 caracteres do YouTube; o video permanece hospedado no YouTube.';
comment on table public.mensagem is
  'Mensagens trocadas depois que a startup aceita o match.';

commit;
