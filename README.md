# Git Rank API

API em NestJS criada na raiz do repositório, sem subpastas.

## Stack

- NestJS (API)
- Swagger em /docs
- Autenticacao JWT (access + refresh)
- BullMQ com Redis em memória via redis-memory-server
- Camada de database em memória para preparar integrações futuras

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

## Executar

```bash
# desenvolvimento
npm run start:dev

# produção local
npm run build
npm run start:prod
```

API local: http://localhost:3000

Swagger: http://localhost:3000/docs

## Variaveis de ambiente

Crie um arquivo .env com os valores abaixo:

PORT=3000
JWT_ACCESS_SECRET=troque-este-segredo-access
JWT_REFRESH_SECRET=troque-este-segredo-refresh
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GITHUB_TOKEN=opcional-para-a-api-do-github
GITHUB_REPOS_CACHE_TTL_SECONDS=300
CACHE_PREFIX=git-rank
API_KEY_EXPIRES_IN_DAYS=90

## Endpoints principais

- Publicos:
	- GET /
	- POST /auth/register
	- POST /auth/login
	- POST /auth/refresh
- Privados (Bearer access token):
	- GET /auth/me
	- POST /auth/logout
	- POST /auth/api-keys
	- GET /auth/api-keys
	- DELETE /auth/api-keys/:apiKeyId
	- GET /github/:username/repos
	- POST /jobs
	- GET /jobs/:id

Exemplo de payload para criar job:

{
  "type": "rank-user",
  "payload": {
    "username": "mateusw12",
    "language": "ts"
  }
}

## Observação sobre armazenamento

Esta versão usa armazenamento em memória:

- Fila BullMQ conectada a Redis em memória (sem serviço externo)
- Camada de database in-memory em src/database
- Usuarios e sessoes JWT em memoria no modulo de autenticacao

Assim, os dados são perdidos ao reiniciar a aplicação. A estrutura já está preparada para trocar por conexões reais no futuro.
