# Git Rank API

API em NestJS criada na raiz do repositório, sem subpastas.

## Stack

- NestJS (API)
- Swagger em /docs
- Autenticacao JWT (access + refresh)
- BullMQ com Redis em memória via redis-memory-server
- Camada de database em memória para preparar integrações futuras
- Integração com GitHub API (repos e commits)
- Scoring de candidato (activity, quality, consistency)
- Avaliação com Gemini (com cache e fallback heurístico)
- Insights de tecnologia e evolução temporal do candidato

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

```bash
# Linux/macOS
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
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

Crie um arquivo `.env` com base no `.env.example`:

```bash
# Linux/macOS
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Variáveis principais:

- `PORT`
- `ENABLE_BULLMQ`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `API_KEY_EXPIRES_IN_DAYS`
- `CACHE_PREFIX`
- `GITHUB_TOKEN`
- `GOOGLE_API_KEY`

Variáveis de cache/limites:

- `GITHUB_REPOS_CACHE_TTL_SECONDS`
- `GITHUB_COMMITS_CACHE_TTL_SECONDS`
- `GITHUB_COMMITS_FETCH_LIMIT`
- `GITHUB_COMMITS_STATS_LIMIT`
- `GITHUB_BATCH_EVALUATION_CONCURRENCY`

Variáveis Gemini:

- `GEMINI_EVALUATION_CACHE_TTL_SECONDS`
- `GEMINI_MODELS`
- `GEMINI_MODEL`
- `GEMINI_TEMPERATURE`
- `GEMINI_MAX_OUTPUT_TOKENS`
- `GEMINI_MAX_REPOSITORIES`
- `GEMINI_MAX_TEXT_FIELD_LENGTH`

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
	- GET /github/:username/score
	- GET /github/:username/evaluation
	- GET /github/:username/insights
	- GET /github/:username/repos
	- GET /github/repos/:owner/:repo/commits
	- POST /github/evaluations/batch
	- POST /jobs
	- GET /jobs/:id

## Exemplo: avaliação em lote

Request (`POST /github/evaluations/batch`):

```json
{
	"usernames": ["mateusw12", "octocat", "torvalds"]
}
```

Resposta (resumida):

```json
{
	"totalRequested": 3,
	"totalProcessed": 3,
	"totalSucceeded": 3,
	"totalFailed": 0,
	"results": [
		{
			"username": "octocat",
			"status": "ok",
			"summary": {
				"scoring": {
					"activityScore": 42,
					"qualityScore": 37,
					"consistencyScore": 58,
					"finalScore": 137
				},
				"aiEvaluation": {
					"score": 73,
					"level": "Pleno",
					"strengths": ["..."],
					"weaknesses": ["..."],
					"evaluatedAt": "2026-05-01T12:00:00.000Z",
					"model": "gemini-2.0-flash"
				},
				"profile": "Backend Node.js",
				"stack": ["Node.js", "NestJS", "MongoDB"],
				"evolution": {
					"isImproving": true,
					"trend": "improving",
					"oldProjectsAverageScore": 18.4,
					"recentProjectsAverageScore": 30.8,
					"deltaScore": 12.4,
					"summary": "Projetos recentes mostram evolucao positiva (delta 12.4)"
				}
			}
		}
	]
}
```

Exemplo de payload para criar job:

```json
{
  "type": "rank-user",
  "payload": {
    "username": "mateusw12",
    "language": "ts"
  }
}
```

## Observação sobre armazenamento

Esta versão usa armazenamento em memória:

- Fila BullMQ conectada a Redis em memória (sem serviço externo)
- Camada de database in-memory em src/database
- Usuarios e sessoes JWT em memoria no modulo de autenticacao
- Store em memória para API keys
- Store em memória para avaliações de candidato

Assim, os dados são perdidos ao reiniciar a aplicação. A estrutura já está preparada para trocar por conexões reais no futuro.
