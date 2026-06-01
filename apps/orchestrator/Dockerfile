# Dockerfile for the SwarmDev Orchestrator (FastAPI)
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set non‑root user for security
RUN useradd -m orchestrator
USER orchestrator

WORKDIR /app

# Install system dependencies (if any) – here we only need pip
COPY --chown=orchestrator:orchestrator requirements.txt ./
RUN pip install --no-cache-dir --retries 10 --timeout 30 -r requirements.txt

# Copy application code
COPY --chown=orchestrator:orchestrator . .

# Expose the FastAPI port (default 8000, but may be overridden)
EXPOSE 8000

# Default command runs uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
