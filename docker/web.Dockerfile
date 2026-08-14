FROM node:24-bookworm-slim AS builder

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN CI=true NX_TASKS_RUNNER_DYNAMIC_OUTPUT=false npx nx build web --configuration=production

FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.uat.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/dist/apps/web/browser /usr/share/nginx/html
EXPOSE 80
