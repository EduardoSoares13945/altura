# Altura API

Backend Spring Boot 3 da Altura, com autenticação própria e persistência PostgreSQL no Neon.

## Requisitos

- Java 17+
- Maven 3.9+
- PostgreSQL com o schema de `../database/altura_schema.sql`

## Configuração

No painel do Neon, abra **Connect**, selecione a conexão pooled e configure no terminal:

```powershell
$env:DB_URL="jdbc:postgresql://SEU_HOST/neondb?sslmode=require&channelBinding=require"
$env:DB_USERNAME="SEU_ROLE"
$env:DB_PASSWORD="SUA_SENHA"
$env:JWT_SECRET="uma-chave-com-pelo-menos-32-bytes"
```

O projeto importa automaticamente `backend/.env` no desenvolvimento local. Crie esse
arquivo como uma cópia de `.env.example`, preencha os dados reais e não o envie ao Git.
Variáveis configuradas pelo sistema ou pela hospedagem continuam tendo precedência.

Variáveis disponíveis:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
DB_POOL_MAX_SIZE=5
JWT_SECRET
JWT_ISSUER=altura-api
JWT_ACCESS_TOKEN_MINUTES=15
JWT_REFRESH_TOKEN_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:5173
AWS_ENDPOINT_URL_S3
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
STORAGE_BUCKET=altura-feed
STORAGE_SIGNED_URL_MINUTES=60
```

Nunca exponha essas variáveis no frontend ou em nomes iniciados por `VITE_`.

## Executar

### Pelo terminal integrado, sem comandos PowerShell

Abra o projeto `nexo` no VS Code e execute:

```cmd
backend\iniciar.cmd
```

O script entra na pasta correta, usa o Maven 3.9.11 instalado em `Program Files`,
mantém o cache Maven dentro do projeto e carrega `backend/.env` automaticamente.

### Pela tarefa do VS Code

Use `Ctrl+Shift+B` e selecione **Iniciar backend**. A tarefa utiliza `cmd.exe`, não
depende do perfil PowerShell e permanece aberta enquanto o Spring Boot estiver rodando.

### Maven diretamente

```powershell
mvn spring-boot:run
```

- API: `http://localhost:8080/api`
- Health: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

## Persistência e autenticação

- Usuários, perfis, segmentos, métricas, rodadas, matches, mensagens e publicações ficam no PostgreSQL.
- Senhas são persistidas com BCrypt.
- Access tokens são JWT HS256 com duração padrão de 15 minutos.
- Refresh tokens são aleatórios, rotativos e armazenados somente como SHA-256.
- A API deriva o usuário do `sub` do JWT e nunca confia em um `usuarioId` enviado pelo navegador.
- Contas reais são criadas pela tela ou pela API. Para desenvolvimento, o script
  `../database/20261015_test_accounts.sql` prepara dois perfis completos de teste.

Rotas públicas:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Rotas autenticadas:

- `GET /api/me`
- `GET /api/segments`
- `GET|PUT|DELETE /api/me/startup-profile`
- `GET|PUT|DELETE /api/me/investor-profile`
- `GET /api/rounds/open` (investidor)
- `GET|POST /api/feed`
- `POST /api/feed` com `multipart/form-data` (publicação + imagem comprimida)
- `POST /api/feed/{postId}/like`
- `POST /api/feed/{postId}/comments`
- `DELETE /api/feed/{postId}` (autor)
- `GET|POST /api/connections`
- `PATCH /api/connections/{connectionId}/status` (startup)
- `GET|POST /api/connections/{connectionId}/messages` (match aceito)

Se o schema principal já foi aplicado antes da criação do feed, execute uma vez
`../database/20261015_feed.sql` no SQL Editor do Neon. Novos bancos podem usar
somente `../database/altura_schema.sql`, que já contém o módulo.

Para habilitar imagem e vídeo em um banco existente, execute também
`../database/20261015_feed_media.sql`. Imagens usam um bucket privado do Neon Object
Storage e URLs assinadas; o PostgreSQL guarda somente a chave do objeto. A API inicia
sem as variáveis de storage, mas nesse estado aceita apenas texto e vídeos do YouTube.

Se o schema principal já foi aplicado antes do sistema de conversas, execute uma vez
`../database/20261015_connections.sql`. O chat é liberado somente depois que a startup
aceita a manifestação de interesse do investidor.

## Testar e empacotar

```powershell
mvn test
mvn package
```

Os testes unitários usam repositórios falsos isolados e não acessam o Neon. A validação de integração deve ser executada em um banco separado do ambiente de produção.
