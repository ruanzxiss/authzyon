# AuthZyon - Código-Fonte Completo

**Versão:** 1.0.0 | **Data:** 24/03/2026 | **Licença:** MIT

---

## 📦 O que está incluído

Este pacote contém o código-fonte completo do sistema **AuthZyon** pronto para deployment.

### Estrutura

```
authzyon/
├── client/                 # Frontend React 19 + Tailwind CSS 4
│   ├── src/
│   │   ├── pages/         # Dashboard, Keys, Users, History, Profile
│   │   ├── components/    # Layout, UI components
│   │   ├── contexts/      # Auth context
│   │   └── lib/           # tRPC client, utilities
│   ├── index.html
│   └── public/
├── server/                 # Backend Express 4 + tRPC 11
│   ├── routers.ts         # tRPC procedures
│   ├── db.ts              # Database helpers
│   ├── iosApi.ts          # iOS REST API endpoints
│   └── _core/             # Core infrastructure
├── drizzle/               # Database schema & migrations
│   ├── schema.ts          # Table definitions
│   └── migrations/
├── shared/                # Shared types & constants
├── Dockerfile             # Production Docker image
├── docker-compose.yml     # Local development setup
├── railway.json           # Railway.app configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Deployment Rápido

### 1. Railway.app (Recomendado)

```bash
# 1. Fazer push para GitHub
git push origin main

# 2. Acessar https://railway.app
# 3. Clique em "New Project" → "Deploy from GitHub"
# 4. Selecione seu repositório
# 5. Railway fará o deploy automaticamente
```

**Resultado:** Seu site estará em `https://seu-projeto.railway.app`

### 2. Docker (Qualquer Host)

```bash
# Executar localmente
docker-compose up -d

# Fazer push para Docker Hub
docker build -t seu-usuario/authzyon .
docker push seu-usuario/authzyon
```

### 3. Manus (Já Online!)

Seu site já está funcionando em:
```
https://authkeys-7gjqytmw.manus.space
```

Clique em "Publish" no painel de gerenciamento para deixar permanente.

---

## 🔧 Setup Local

### Pré-requisitos

- Node.js 22.x
- pnpm (ou npm)
- MySQL 8.0+

### Instalação

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar banco de dados
# Criar arquivo .env.local com:
DATABASE_URL=mysql://user:pass@localhost:3306/authzyon
JWT_SECRET=seu-secret-aqui

# 3. Executar migrations
pnpm drizzle-kit push

# 4. Iniciar servidor
pnpm dev
```

Acesse: http://localhost:3000

---

## 📊 Tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React | 19.2.1 |
| Styling | Tailwind CSS | 4.1.14 |
| Backend | Express | 4.21.2 |
| API | tRPC | 11.6.0 |
| Database | MySQL/TiDB | 8.0+ |
| ORM | Drizzle | 0.44.5 |
| Build | Vite | 7.1.7 |
| Runtime | Node.js | 22.x |

---

## 🔐 Credenciais Padrão

**Admin:**
- Usuário: `RUAN`
- Senha: `RUAN123`

⚠️ **IMPORTANTE:** Altere essas credenciais em produção!

---

## 📝 Variáveis de Ambiente

### Obrigatórias

```env
DATABASE_URL=mysql://user:password@host:3306/authzyon
JWT_SECRET=seu-secret-super-seguro-minimo-32-caracteres
NODE_ENV=production
```

### Opcionais

```env
VITE_APP_TITLE=AuthZyon
VITE_APP_LOGO=https://cdn.example.com/logo.png
PORT=3000
```

Veja `.env.example` para mais detalhes.

---

## 🌐 Endpoints da API

### Públicos (iOS)

- `POST /api/ios/validate-key` - Validar key de licença
- `POST /api/ios/check-session` - Verificar sessão ativa
- `GET /api/ios/key-info` - Informações da key

### Protegidos (tRPC)

- `trpc.auth.me` - Dados do usuário atual
- `trpc.auth.logout` - Fazer logout
- `trpc.keys.create` - Criar nova key
- `trpc.keys.list` - Listar keys
- `trpc.keys.pause` - Pausar key
- `trpc.keys.ban` - Banir key
- `trpc.users.create` - Criar usuário (admin)
- `trpc.users.list` - Listar usuários (admin)
- `trpc.history.list` - Histórico de login

---

## 📱 Integração iOS

Veja `client/public/ios-docs.md` para:
- Código Swift completo
- Código Objective-C
- Tela de login FFH4X
- Fluxo de autenticação
- Armazenamento de sessão

---

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Testes com coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

---

## 🏗️ Build para Produção

```bash
# Build frontend
pnpm build

# Build backend
pnpm build

# Resultado em:
# - client/dist/
# - dist/
```

---

## 📦 Deploy com Docker

### Build

```bash
docker build -t authzyon:latest .
```

### Run

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://... \
  -e JWT_SECRET=... \
  authzyon:latest
```

### Docker Compose

```bash
docker-compose up -d
```

---

## 🔍 Troubleshooting

### Erro: "Connection refused"

```bash
# Verificar MySQL
mysql -u root -p -e "SELECT 1"

# Se não estiver rodando
brew services start mysql
```

### Erro: "Port 3000 already in use"

```bash
# Matar processo
lsof -ti:3000 | xargs kill -9
```

### Erro: "Cannot find module"

```bash
# Reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📚 Documentação Adicional

- **Deployment:** Veja `AUTHZYON_DEPLOYMENT_GUIDE.md`
- **Quick Start:** Veja `AUTHZYON_QUICK_START.md`
- **iOS Integration:** Veja `client/public/ios-docs.md`

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📞 Suporte

- **Issues:** https://github.com/seu-usuario/authzyon/issues
- **Documentação:** Veja README.md

---

## 📄 Licença

MIT License

---

**Seu sistema AuthZyon está pronto para produção! 🚀**
