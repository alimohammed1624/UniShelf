# Prometheus & Grafana Integration Plan

## Overview

This document outlines the implementation plan for adding performance monitoring to UniShelf using Prometheus and Grafana. The goal is to monitor backend API metrics, MinIO storage operations, and frontend performance without significant complexity.

---

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Frontend   │    │   Backend    │    │    MinIO    │
│  (Next.js)  │    │   (FastAPI)  │    │   (Storage) │
└──────┬──────┘    └──────┬───────┘    └──────┬──────┘
       │                 │                    │
       │                 │                    │
       └─────────────────┴────────────────────┘
                         │
                         ▼
                  ┌────────────┐
                  │  Prometheus│ (Scrapes metrics every 15s)
                  └──────┬─────┘
                         │
                         ▼
                  ┌────────────┐
                  │   Grafana  │ (Visualization & dashboards)
                  └────────────┘
```

---

## What Will Be Monitored

### 1. Backend Metrics (FastAPI)

**HTTP Metrics:**
- Request count by endpoint, method, and status code
- Response time percentiles (p50, p95, p99)
- Request size and response size

**Custom Application Metrics:**
- Authentication attempts (success/failure)
- Resource upload count and total size
- Download count and total bandwidth
- Tag operations count

### 2. MinIO Storage Metrics

- Total storage used and available
- API operation counts (PUT, GET, DELETE, LIST)
- Request latency percentiles
- Error rates

### 3. Frontend Performance Metrics

- Page load times
- API response times from user perspective
- Error boundary catches

---

## Implementation Steps

### Phase 1: Backend Instrumentation

#### Step 1.1: Install Prometheus Package

```bash
cd backend
uv add prometheus-fastapi-instrumentator
```

#### Step 1.2: Update `backend/app/main.py`

Add the following code to instrument the FastAPI application:

```python
from prometheus_fastapi_instrumentator import Instrumentator

# After creating the app but before including routers
instrumentator = Instrumentator(
    should_ignore_healthchecks=False,
    should_group_status_codes=True,
)
instrumentator.instrument(app).expose(app)
```

#### Step 1.3: Add Custom Metrics

Add these metrics to track application-specific events:

```python
from prometheus_client import Counter, Histogram

# Upload metrics
UPLOAD_COUNT = Counter('unishelf_uploads_total', 'Total number of uploads')
UPLOAD_SIZE = Histogram('unishelf_upload_size_bytes', 'Upload size in bytes')

# Download metrics
DOWNLOAD_COUNT = Counter('unishelf_downloads_total', 'Total number of downloads')

# Auth metrics
AUTH_ATTEMPTS = Counter('unishelf_auth_attempts_total', 'Authentication attempts', ['status'])
```

Update the relevant endpoints to increment these counters.

### Phase 2: MinIO Metrics

#### Step 2.1: Update `compose.yaml`

Modify the MinIO service command to enable metrics endpoint:

**Before:**
```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
```

**After:**
```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001" --metrics-address ":9002"
```

MinIO will now expose metrics at `http://localhost:9002/metrics`

### Phase 3: Prometheus Configuration

#### Step 3.1: Create `prometheus.yml`

Create a new file `prometheus.yml` in the project root.

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'unishelf-backend'
    static_configs:
      - targets: ['backend:8000']

  - job_name: 'minio'
    static_configs:
      - targets: ['minio:9002']
```

#### Step 3.2: Add Prometheus Service to `compose.yaml`

Add this service after the existing services.

```yaml
prometheus:
  image: prom/prometheus:v2.48.0
  ports:
    - "9090:9090"
  volumes:
    - ./data/prometheus:/prometheus
    - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
  depends_on:
    - backend
    - minio
```

### Phase 4: Grafana Configuration

#### Step 4.1: Add Grafana Service to `compose.yaml`

Add this service after Prometheus.

```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  volumes:
    - ./data/grafana:/var/lib/grafana
  environment:
    - GF_AUTH_DISABLE_LOGIN_FORM=false
    - GF_AUTH_ANALYTICS_REPORTING_ENABLED=true
    - GF_SECURITY_ADMIN_PASSWORD=admin
  depends_on:
    - prometheus
```

#### Step 4.2: Configure Grafana Data Source

1. Access Grafana at `http://localhost:3001`
2. Login with admin/admin (will prompt to change password)
3. Go to **Configuration > Data Sources**
4. Click **"Add data source"**
5. Select **Prometheus**
6. Set URL to `http://prometheus:9090`
7. Click **"Save & Test"**

### Phase 5: Frontend Metrics (Optional but Recommended)

#### Step 5.1: Update `frontend/lib/utils.ts`

Add performance tracking.

```typescript
export const trackMetric = (name: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, { value });
  }
};

export const measureApiResponse = async <T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Send to Prometheus pushgateway or just log
    console.log(`API ${endpoint} took ${duration.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    console.error(`API ${endpoint} failed:`, error);
    throw error;
  }
};
```

---

## Deployment

### Start the Stack

```bash
# Stop existing containers if running
docker-compose down

# Start all services including new monitoring tools
docker-compose up -d --build
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Main App | http://localhost:8000 | - |
| Frontend (direct) | http://localhost:3000 | - |
| Backend API | http://localhost:8000/api | - |
| MinIO Console | http://localhost:9001 | minioadmin:minioadmin |
| **Prometheus** | **http://localhost:9090** | - |
| **Grafana** | **http://localhost:3001** | **admin/admin** |

### Verify Installation

1. **Check Prometheus is scraping targets:**
   - Go to `http://localhost:9090/targets`
   - Verify all targets show "UP" status

2. **Test metric collection:**
   - Upload a file via the app
   - Check metrics at `http://localhost:8000/metrics`
   - You should see increased `unishelf_uploads_total` counter

3. **Verify Grafana dashboard:**
   - Go to `http://localhost:3001/dashboards`
   - Create a new dashboard with panels for:
     - `unishelf_uploads_total`
     - `http_requests_total`
     - `minio_io_bytes_total`

---

## Available Metrics

### Backend Metrics (from prometheus-fastapi-instrumentator)

```
# HTTP requests
http_requests_total{method="GET",status="200"}
http_request_duration_seconds{quantile="0.5"}
http_request_duration_seconds{quantile="0.9"}
http_request_duration_seconds{quantile="0.99"}

# Request size
http_request_size_bytes{method="POST"}
http_response_size_bytes{method="GET"}
```

### Custom UniShelf Metrics

```
# Uploads
unishelf_uploads_total
unishelf_upload_size_bytes_bucket
unishelf_upload_size_bytes_sum
unishelf_upload_size_bytes_count

# Downloads
unishelf_downloads_total

# Authentication
unishelf_auth_attempts_total{status="success"}
unishelf_auth_attempts_total{status="failure"}

# Database queries (if added later)
sqlalchemy_queries_total
sqlalchemy_query_duration_seconds_bucket
```

### MinIO Metrics

```
# Storage usage
minio_node_filesystem_size_bytes
minio_node_filesystem_avail_bytes

# API operations
minio_http_requests_total{handler="api"}
minio_s3_requests_total{type="PUT",bucket="unishelf-uploads"}
minio_s3_requests_total{type="GET",bucket="unishelf-uploads"}

# Latency
minio_s3_request_duration_seconds_bucket{handler="PutObject"}
```

---

## Common Queries for Dashboards

### Backend Performance

```promql
# Request rate by endpoint
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m]))
```

### Upload Statistics

```promql
# Upload count over time
rate(unishelf_uploads_total[1h])

# Average upload size
rate(unishelf_upload_size_bytes_sum[1h]) 
/ 
rate(unishelf_upload_size_bytes_count[1h])
```

### MinIO Storage

```promql
# Storage used (in GB)
minio_node_filesystem_size_bytes / 1024 / 1024 / 1024

# Storage available (in GB)
minio_node_filesystem_avail_bytes / 1024 / 1024 / 1024
```

---

## Troubleshooting

### Prometheus not scraping backend

```bash
# Check if backend is running
docker-compose ps backend

# Test metrics endpoint directly
curl http://localhost:8000/metrics

# Check Prometheus logs
docker-compose logs prometheus
```

### MinIO metrics not visible

```bash
# Verify MinIO has metrics enabled
docker-compose exec minio sh -c "ps aux | grep minio"

# Test metrics endpoint
curl http://localhost:9002/metrics
```

### Grafana can't connect to Prometheus

```bash
# Check network connectivity
docker-compose exec grafana ping prometheus

# Verify Prometheus service name in Docker DNS
docker-compose exec grafana getent hosts prometheus
```

---

## Future Enhancements

### Phase 3 Additions (When Migrating to Production)

1. **Add PostgreSQL Exporter**
   ```yaml
   postgres_exporter:
     image: prometheuscommunity/postgres-exporter:v0.15.0
     ports:
       - "9187:9187"
     environment:
       - DATA_SOURCE_NAME=postgresql://user:pass@db:5432/db
   ```

2. **Enable Database Metrics in FastAPI**
   ```python
   from prometheus_client import Counter
   
   DB_QUERY_COUNT = Counter('sqlalchemy_queries_total', 'Database queries')
   
   # In database.py, wrap queries to increment counter
   ```

3. **Add Alertmanager** (if alerting is needed later)
   ```yaml
   alertmanager:
     image: prom/alertmanager:v0.26.0
     ports:
       - "9093:9093"
   ```

### Performance Optimization

- Adjust `scrape_interval` in Prometheus based on needs (current: 15s)
- Use label filtering to reduce metric cardinality
- Implement metric retention policies based on storage capacity

---

## Maintenance

### Backing Up Metrics

```bash
# Backup Prometheus data
docker-compose exec prometheus sh -c "tar czf /prometheus-backup.tgz /prometheus"

# Restore
docker-compose exec prometheus sh -c "tar xzf /prometheus-backup.tgz -C /"
```

### Clearing Old Metrics

```bash
# Stop Prometheus, remove data, restart
docker-compose stop prometheus
rm -rf ./data/prometheus/*
docker-compose up -d prometheus
```

---

## Summary

This implementation provides:

- **Backend metrics** - HTTP requests, custom app events
- **Storage monitoring** - MinIO usage and operations
- **Performance visualization** - Grafana dashboards
- **Easy deployment** - Docker Compose integration
- **Minimal changes** - Only 2 files modified

The system is ready for production migration with PostgreSQL exporter when needed.
