FROM node:24-bookworm-slim AS builder

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN CI=true NX_TASKS_RUNNER_DYNAMIC_OUTPUT=false npx nx build api --configuration=production

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /workspace/package.json ./package.json
COPY --from=builder /workspace/package-lock.json ./package-lock.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /workspace/dist/apps/api ./dist/apps/api
COPY --from=builder /workspace/tools/demo-seed ./tools/demo-seed
RUN mkdir -p /app/storage/uploads && chown -R node:node /app

USER node
EXPOSE 3000
CMD ["node", "dist/apps/api/main.js"]
