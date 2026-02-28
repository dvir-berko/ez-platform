# ─────────────────────────────────────────────────────────────────────────────
# ez-demo — EZ Platform Demo Service
# Docker Hub: dvirbf/ez-demo
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

LABEL org.opencontainers.image.title="ez-demo" \
      org.opencontainers.image.description="EZ Platform Golden Path demo service" \
      org.opencontainers.image.source="https://github.com/dvir-berko/ez-platform" \
      org.opencontainers.image.authors="dvirbf" \
      ez.platform/tier="lite" \
      ez.platform/team="platform"

RUN groupadd --gid 10001 appgroup && \
    useradd  --uid 10001 --gid appgroup --no-create-home appuser

WORKDIR /app
COPY --from=builder /install /usr/local
COPY src/ ./src/

USER appuser

ENV PORT=8080 \
    APP_ENV=demo \
    APP_VERSION=demo \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/healthz')"

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
