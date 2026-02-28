# ─────────────────────────────────────────────────────────────────────────────
# EZ Lite Service — ${{ values.name }}
# Multi-stage build for minimal production image.
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build / dependency resolution
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# Stage 2: Production image
FROM python:3.12-slim AS runtime

LABEL org.opencontainers.image.title="${{ values.name }}" \
      org.opencontainers.image.description="${{ values.description }}" \
      ez.platform/team="${{ values.team }}" \
      ez.platform/tier="lite"

# Non-root user for security
RUN groupadd --gid 10001 appgroup && \
    useradd  --uid 10001 --gid appgroup --no-create-home appuser

WORKDIR /app

# Copy installed dependencies from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY src/ ./src/

USER appuser

ENV PORT=8080 \
    APP_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/healthz')"

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
