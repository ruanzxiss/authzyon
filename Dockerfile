# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar package files e patches
COPY package.json pnpm-lock.yaml* ./
COPY patches ./patches

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar código-fonte
COPY . .

# Build
RUN pnpm build

# Production stage
FROM node:22-alpine
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar package files e patches
COPY package.json pnpm-lock.yaml* ./
COPY patches ./patches

# Instalar apenas dependências de produção
RUN pnpm install --prod --frozen-lockfile

# Copiar arquivos compilados do builder
COPY --from=builder /app/dist ./dist

# Expor porta
EXPOSE 3000

# Start
CMD ["pnpm", "start"]
