# Backend image — FastAPI + uvicorn (dev, hot-reload).
# Build context is the repo root (requirements.txt lives there), so this is
# referenced from docker-compose.yml as:
#     build: { context: ., dockerfile: backend/Dockerfile }
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first so the layer is cached across code changes.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# Baked-in copy is a fallback; docker-compose bind-mounts ./backend over this
# for live editing. memory/, sessions/ and skills/ are mounted at runtime.
COPY backend/ ./backend/

EXPOSE 8000

# Imports are `from backend...`, so run from /app with backend as a package.
# --reload-dir limits the watcher to source (not the mounted data dirs).
CMD ["uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--reload", "--reload-dir", "/app/backend"]
