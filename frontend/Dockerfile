# Frontend image — Vite dev server (hot-reload).
# Build context is ./frontend (see docker-compose.yml).
# Vite 8 requires Node >=22.12, so pin to the 22 line.
FROM node:22-alpine

WORKDIR /app

# Install deps first for layer caching. npm ci needs package-lock.json.
COPY package.json package-lock.json ./
RUN npm ci

# Baked-in copy is a fallback; docker-compose bind-mounts ./frontend over this
# for live editing, with an anonymous volume preserving this node_modules.
COPY . ./

EXPOSE 5173

# --host binds 0.0.0.0 so the dev server is reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
