# Git Rank API

API em NestJS criada na raiz do repositório, sem subpastas.

## Stack

- NestJS (API)
- Swagger em `/docs`
- BullMQ com conexão Redis em memória via `ioredis-mock`
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

API local: `http://localhost:3000`

Swagger: `http://localhost:3000/docs`

## Endpoints principais

- `GET /` status da API
- `POST /jobs` cria um job na fila
- `GET /jobs/:id` retorna status e resultado do job

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

- Fila BullMQ conectada a Redis mock em memória
- Camada de database in-memory em `src/database`

Assim, os dados são perdidos ao reiniciar a aplicação. A estrutura já está preparada para trocar por conexões reais no futuro.
