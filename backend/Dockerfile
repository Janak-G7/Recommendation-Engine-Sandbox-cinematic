FROM python:3.11-slim

WORKDIR /app

# System deps (build tools for pandas/duckdb wheels if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Bind to 0.0.0.0 so the container is reachable from the host / other containers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
