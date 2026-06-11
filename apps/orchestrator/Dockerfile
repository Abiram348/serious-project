# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────
# SwarmDev Orchestrator — Python/FastAI Dockerfile
# Multi-stage: deps → runner
# ──────────────────────────────────────────────

ARG PYTHON_VERSION=3.11

# ═══════════════════════════════════════════════
# Stage 1 — Builder (compile Python deps with wheels)
# ═══════════════════════════════════════════════
FROM python:${PYTHON_VERSION}-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Upgrade pip and install deps as wheels
RUN pip install --upgrade pip wheel
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels -r requirements.txt

# ═══════════════════════════════════════════════
# Stage 2 — Runner
# ═══════════════════════════════════════════════
FROM python:${PYTHON_VERSION}-slim AS runner

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Create non-root user
RUN groupadd --gid 1001 orchestrator && \
    useradd --uid 1001 --gid orchestrator --shell /bin/false --create-home orchestrator

# Copy wheels and install
COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache /wheels/* && rm -rf /wheels

# Copy application code
COPY --chown=orchestrator:orchestrator . .

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8000/health || exit 1

USER orchestrator
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
