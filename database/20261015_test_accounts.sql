-- contas completas para testes locais/homologacao
-- Execute no SQL Editor do Neon depois de aplicar altura_schema.sql.
--
-- Startup:   startup.teste@altura.com
-- Investidor: investidor.teste@altura.com
-- Senha das duas contas: Altura@123

begin;

insert into public.segmento (nome)
values
  ('Finanças'),
  ('Educação'),
  ('Software e serviços digitais')
on conflict (nome) do nothing;

-- Contas autenticadas pelo Spring Boot. Os hashes BCrypt abaixo foram gerados
-- com o mesmo BCryptPasswordEncoder usado pela API.
insert into public.usuario (id, email, password_hash, nome, tipo, ativo)
values (
  gen_random_uuid(),
  'startup.teste@altura.com',
  '$2a$10$TNuVzTnjE7.xtdJ9iMy.K.48hLzfHjxOIIhGoBw5/isib1PjutmM6',
  'Marina Costa',
  'startup',
  true
)
on conflict ((lower(email))) do update set
  password_hash = excluded.password_hash,
  nome = excluded.nome,
  tipo = excluded.tipo,
  ativo = true,
  updated_at = now();

insert into public.usuario (id, email, password_hash, nome, tipo, ativo)
values (
  gen_random_uuid(),
  'investidor.teste@altura.com',
  '$2a$10$Y3bofcfd7MFoA9okG7sXQu3KADzxVRTzgaYi3cjHP9I7eAcUgnp3.',
  'Rafael Almeida',
  'investidor',
  true
)
on conflict ((lower(email))) do update set
  password_hash = excluded.password_hash,
  nome = excluded.nome,
  tipo = excluded.tipo,
  ativo = true,
  updated_at = now();

-- Perfil completo da startup em tracao.
insert into public.startup (
  usuario_id,
  segmento_id,
  nome,
  cnpj,
  fase,
  descricao,
  video_pitch_url,
  data_fundacao,
  site_url,
  linkedin_url,
  localizacao,
  cidade,
  estado,
  latitude,
  longitude
)
values (
  (select id from public.usuario where email = 'startup.teste@altura.com'),
  (select id from public.segmento where nome = 'Software e serviços digitais'),
  'NexoFlow',
  '00999888000177',
  'Tração',
  'Plataforma SaaS que ajuda pequenas empresas a acompanhar vendas, clientes e indicadores de crescimento.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  date '2022-04-10',
  'https://example.com/nexoflow',
  'https://www.linkedin.com/company/nexoflow',
  'São Paulo, SP',
  'São Paulo',
  'SP',
  -23.550520,
  -46.633308
)
on conflict (usuario_id) do update set
  segmento_id = excluded.segmento_id,
  nome = excluded.nome,
  cnpj = excluded.cnpj,
  fase = excluded.fase,
  descricao = excluded.descricao,
  video_pitch_url = excluded.video_pitch_url,
  data_fundacao = excluded.data_fundacao,
  site_url = excluded.site_url,
  linkedin_url = excluded.linkedin_url,
  localizacao = excluded.localizacao,
  cidade = excluded.cidade,
  estado = excluded.estado,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();

delete from public.startup_segmento
where startup_id = (
  select s.id
  from public.startup s
  join public.usuario u on u.id = s.usuario_id
  where u.email = 'startup.teste@altura.com'
);

insert into public.startup_segmento (startup_id, segmento_id)
select
  s.id,
  sg.id
from public.startup s
join public.usuario u on u.id = s.usuario_id
cross join public.segmento sg
where u.email = 'startup.teste@altura.com'
  and sg.nome in ('Finanças', 'Educação')
on conflict do nothing;

insert into public.startup_metrica (
  startup_id,
  mes_referencia,
  receita_mensal,
  mrr,
  clientes_ativos,
  pilotos_ativos,
  crescimento_mensal,
  evidencia_tracao
)
values (
  (
    select s.id
    from public.startup s
    join public.usuario u on u.id = s.usuario_id
    where u.email = 'startup.teste@altura.com'
  ),
  date_trunc('month', current_date)::date,
  85000.00,
  72000.00,
  68,
  4,
  18.50,
  'A base cresceu de 40 para 68 clientes pagantes e manteve 92% de renovação nos últimos três meses.'
)
on conflict (startup_id, mes_referencia) do update set
  receita_mensal = excluded.receita_mensal,
  mrr = excluded.mrr,
  clientes_ativos = excluded.clientes_ativos,
  pilotos_ativos = excluded.pilotos_ativos,
  crescimento_mensal = excluded.crescimento_mensal,
  evidencia_tracao = excluded.evidencia_tracao,
  updated_at = now();

delete from public.captacao
where startup_id = (
  select s.id
  from public.startup s
  join public.usuario u on u.id = s.usuario_id
  where u.email = 'startup.teste@altura.com'
);

insert into public.captacao (
  startup_id,
  valor_alvo,
  valor_captado,
  percentual_equity_oferecido,
  status,
  data_inicio
)
values (
  (
    select s.id
    from public.startup s
    join public.usuario u on u.id = s.usuario_id
    where u.email = 'startup.teste@altura.com'
  ),
  1500000.00,
  350000.00,
  12.50,
  'aberta',
  current_date
);

-- Perfil completo do investidor.
insert into public.investidor (
  usuario_id,
  nome,
  cpf,
  tipo,
  biografia,
  linkedin_url,
  localizacao,
  cidade,
  estado,
  latitude,
  longitude
)
values (
  (select id from public.usuario where email = 'investidor.teste@altura.com'),
  'Rafael Almeida',
  '52998224725',
  'Investidor-anjo',
  'Investidor com experiência em SaaS B2B, fintechs e negócios digitais que já apresentam tração comercial.',
  'https://www.linkedin.com/in/rafael-almeida',
  'São Paulo, SP',
  'São Paulo',
  'SP',
  -23.550520,
  -46.633308
)
on conflict (usuario_id) do update set
  nome = excluded.nome,
  cpf = excluded.cpf,
  tipo = excluded.tipo,
  biografia = excluded.biografia,
  linkedin_url = excluded.linkedin_url,
  localizacao = excluded.localizacao,
  cidade = excluded.cidade,
  estado = excluded.estado,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();

delete from public.investidor_segmento
where investidor_id = (
  select i.id
  from public.investidor i
  join public.usuario u on u.id = i.usuario_id
  where u.email = 'investidor.teste@altura.com'
);

insert into public.investidor_segmento (investidor_id, segmento_id)
select
  i.id,
  sg.id
from public.investidor i
join public.usuario u on u.id = i.usuario_id
cross join public.segmento sg
where u.email = 'investidor.teste@altura.com'
  and sg.nome in ('Finanças', 'Software e serviços digitais')
on conflict do nothing;

commit;

-- Confirma as contas criadas sem exibir os hashes.
select
  email,
  'Altura@123' as senha_de_teste,
  tipo,
  ativo
from public.usuario
where email in (
  'startup.teste@altura.com',
  'investidor.teste@altura.com'
)
order by tipo;
