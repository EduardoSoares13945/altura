# Deploy da Altura

O projeto gera dois artefatos independentes:

- `Dockerfile` na raiz: frontend React servido pelo Nginx.
- `backend/Dockerfile`: API Spring Boot com Java 17 e perfil `prod`.

O workflow `.github/workflows/ci.yml` valida automaticamente o build do frontend
e os testes/empacotamento do backend em pushes para `main` e pull requests.

## 1. Banco de dados

Em um PostgreSQL vazio, execute `database/altura_schema.sql`. Em um banco já
existente, aplique somente as migrations ainda pendentes, em ordem de nome. O
arquivo `20261015_test_accounts.sql` contém dados de desenvolvimento e não deve
ser executado em produção.

## 2. Backend

Use `backend` como contexto de build:

```bash
docker build -t altura-api ./backend
docker run --rm -p 8080:8080 \
  -e DB_URL='jdbc:postgresql://HOST/BANCO?sslmode=require' \
  -e DB_USERNAME='USUARIO' \
  -e DB_PASSWORD='SENHA' \
  -e JWT_SECRET='SEGREDO_ALEATORIO_COM_PELO_MENOS_32_BYTES' \
  -e CORS_ALLOWED_ORIGINS='https://app.seudominio.com' \
  altura-api
```

Variáveis obrigatórias no perfil `prod`:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET` (aleatório e com pelo menos 32 bytes)
- `CORS_ALLOWED_ORIGINS` (origens HTTPS separadas por vírgula, sem `/` final)

As variáveis de Object Storage listadas em `backend/.env.example` são necessárias
para uploads de imagem. `PORT` é respeitada automaticamente pela aplicação.

O health check da hospedagem deve apontar para `/actuator/health`. Para habilitar
Swagger deliberadamente, configure `SWAGGER_ENABLED=true`.

## 3. Frontend

`VITE_API_URL` é incorporada durante o build, portanto passe a URL pública da API
como argumento, incluindo `/api`:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.seudominio.com/api \
  -t altura-web .
docker run --rm -p 8081:80 altura-web
```

O Nginx já possui fallback para `index.html`, necessário para as rotas da SPA.
Depois de alterar a URL da API, gere uma nova imagem do frontend.

## 4. Checklist de publicação

- Use HTTPS no frontend e na API; o WebSocket muda automaticamente para `wss`.
- Não envie `.env`, `backend/.env` ou credenciais para o repositório.
- Confirme que `CORS_ALLOWED_ORIGINS` contém exatamente o domínio do frontend.
- Valide `GET /actuator/health` antes de liberar tráfego.
- Teste cadastro, login, refresh de sessão, upload e uma mensagem em tempo real.
- Configure backup e retenção no PostgreSQL antes de aceitar dados reais.

