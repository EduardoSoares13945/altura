-- imagens e videos do YouTube nas publicacoes do feed
-- Execute uma vez no SQL Editor do Neon depois de 20261015_feed.sql.

begin;

alter table public.postagem
  add column if not exists imagem_chave varchar(500),
  add column if not exists youtube_video_id varchar(11);

alter table public.postagem
  drop constraint if exists postagem_youtube_video_id_valido,
  drop constraint if exists postagem_apenas_uma_midia;

alter table public.postagem
  add constraint postagem_youtube_video_id_valido check (
    youtube_video_id is null
    or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'
  ),
  add constraint postagem_apenas_uma_midia check (
    num_nonnulls(imagem_chave, youtube_video_id) <= 1
  );

comment on column public.postagem.imagem_chave is
  'Chave do objeto comprimido no Neon Object Storage; nunca armazena os bytes da imagem.';
comment on column public.postagem.youtube_video_id is
  'ID validado de 11 caracteres do YouTube; o video permanece hospedado no YouTube.';

commit;
