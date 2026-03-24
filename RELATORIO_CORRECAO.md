# Diagnóstico e Solução: Erro de Criação de Tabelas no AuthZyon na Railway

## Diagnóstico do Problema

Ao analisar o repositório **AuthZyon**, foi identificado que o erro `DB not available` e a falha ao criar o administrador (`ensureAdminExists`) ocorrem porque as tabelas do banco de dados não estão sendo criadas automaticamente quando a aplicação é implantada na Railway.

A causa raiz é que o projeto utiliza o **Drizzle ORM** para gerenciar o banco de dados, mas o processo de inicialização da aplicação (`npm start` ou `pnpm start`) apenas inicia o servidor Express (`node dist/index.js`). Em nenhum momento durante o processo de *build* ou *start* na Railway, o comando para aplicar as migrações SQL (que efetivamente criam as tabelas no banco MySQL) é executado.

Quando o servidor inicia, a função `ensureAdminExists()` tenta inserir o usuário administrador na tabela `app_users`. Como a tabela não existe, a operação falha, resultando no erro relatado.

## Solução Implementada

Para resolver esse problema e garantir que o banco de dados seja sempre inicializado corretamente em qualquer ambiente de produção (como a Railway), foram realizadas as seguintes alterações:

1.  **Criação do script de migração (`server/migrate.ts`)**:
    Foi criado um novo arquivo responsável por conectar ao banco de dados e aplicar todas as migrações pendentes localizadas na pasta `drizzle/`. Este script utiliza a função `migrate` do Drizzle ORM.

2.  **Atualização do processo de Build (`package.json`)**:
    O script de `build` foi modificado para também compilar o novo arquivo `migrate.ts` para a pasta `dist/`.
    *Antes:* `"build": "vite build && esbuild server/_core/index.ts ..."`
    *Depois:* `"build": "vite build && esbuild server/_core/index.ts ... && esbuild server/migrate.ts ..."`

3.  **Atualização do processo de Start (`package.json`)**:
    O script `start` foi alterado para executar o script de migração *antes* de iniciar o servidor principal. Dessa forma, garantimos que as tabelas existam antes que a função `ensureAdminExists()` seja chamada.
    *Antes:* `"start": "NODE_ENV=production node dist/index.js"`
    *Depois:* `"start": "NODE_ENV=production node dist/migrate.js && NODE_ENV=production node dist/index.js"`

## Como Aplicar no Seu Repositório

Você precisa aplicar essas alterações no seu repositório local e fazer o *push* para o GitHub. A Railway detectará a mudança, fará um novo *build* e, ao iniciar a aplicação, as tabelas serão criadas automaticamente.

### Passo 1: Crie o arquivo `server/migrate.ts`

Crie um arquivo chamado `migrate.ts` dentro da pasta `server/` com o seguinte conteúdo:

```typescript
import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Running migrations...");
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  const migrationsFolder = path.resolve(__dirname, "../drizzle");
  
  await migrate(db, { migrationsFolder });
  
  console.log("Migrations applied successfully!");
  
  await connection.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

### Passo 2: Atualize o `package.json`

Modifique os scripts `build` e `start` no seu arquivo `package.json`:

```json
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && esbuild server/migrate.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/migrate.js && NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
    "db:push": "drizzle-kit generate && drizzle-kit migrate"
  },
```

Após fazer essas duas alterações, faça o commit e o push para o seu repositório. A Railway cuidará do resto!
