# Multi-Stage Production Dockerfile for Token 9898048483 PQC Node
# Stage 1: Build Dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    libffi-dev \
    git \
    tor \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Hardened Runtime Container
FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime Tor daemon and security utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    tor \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy source tree
COPY . /app

# Configure non-root secure user
RUN groupadd -r tokenuser && useradd -r -g tokenuser tokenuser && \
    mkdir -p /app/data /var/lib/tor/token_hidden_service && \
    chown -R tokenuser:tokenuser /app /var/lib/tor

USER tokenuser

EXPOSE 8000 9050 9051

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/metrics || exit 1

ENTRYPOINT ["python", "-m", "uvicorn", "server.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
