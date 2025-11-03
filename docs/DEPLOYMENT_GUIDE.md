# Code Assessment Platform - Deployment Guide

This guide covers deploying the Code Assessment Platform to production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Configuration](#configuration)
6. [Monitoring](#monitoring)
7. [Scaling](#scaling)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18 or higher
- **Docker**: v20.10 or higher (for containerized deployment)
- **Docker Compose**: v2.0 or higher (for Docker Compose deployment)
- **Git**: For cloning the repository
- **GitHub Personal Access Token**: With `repo` scope for private repositories

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4GB
- Disk: 10GB free space

**Recommended** (Production):
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 50GB+ free space
- SSD storage for better performance

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/code_assessment.git
cd code_assessment
```

### 2. Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_token_here

# Server Configuration
PORT=3000
HOST=0.0.0.0

# CORS Configuration
CORS_ENABLED=true
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Analysis Configuration
USE_EXTERNAL_SCANNERS=true
ANALYSIS_TIMEOUT=300000
MAX_FILE_SIZE=10485760

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/app/logs/app.log

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=3600
```

### 3. Install Dependencies

```bash
npm ci
```

---

## Docker Deployment

### Quick Start

**Start all services**:
```bash
docker-compose up -d
```

**View logs**:
```bash
docker-compose logs -f api
```

**Stop services**:
```bash
docker-compose down
```

### Production Deployment

1. **Build production image**:
```bash
docker-compose build --no-cache
```

2. **Set environment variables**:
Edit `docker-compose.yml` or use environment variables:
```bash
export GITHUB_TOKEN=your_token
export POSTGRES_PASSWORD=secure_password
docker-compose up -d
```

3. **Verify deployment**:
```bash
curl http://localhost:3000/health
```

### Docker Compose Services

The `docker-compose.yml` includes:
- **API Service**: Main application server
- **Redis**: Caching layer
- **PostgreSQL**: Results persistence (future use)

### Volume Management

Persistent volumes are created for:
- `redis-data`: Redis persistence
- `postgres-data`: PostgreSQL data
- `./logs`: Application logs
- `./output`: Analysis output files

---

## Manual Deployment

### 1. Build Application

```bash
npm run build
```

### 2. Start Server

**Development**:
```bash
npm start
```

**Production** (with PM2):
```bash
npm install -g pm2
pm2 start dist/api/server.js --name code-assessment-api
pm2 save
pm2 startup
```

**Production** (with systemd):
Create `/etc/systemd/system/code-assessment.service`:
```ini
[Unit]
Description=Code Assessment Platform API
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/code-assessment
ExecStart=/usr/bin/node dist/api/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/code-assessment/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable code-assessment
sudo systemctl start code-assessment
```

---

## Configuration

### Server Configuration

| Variable | Default | Description |
|---------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `CORS_ENABLED` | true | Enable CORS |
| `CORS_ORIGIN` | * | Allowed origins |
| `RATE_LIMIT_ENABLED` | true | Enable rate limiting |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | 100 | Max requests per window |

### Analysis Configuration

| Variable | Default | Description |
|---------|---------|-------------|
| `USE_EXTERNAL_SCANNERS` | true | Use ESLint, npm audit, Semgrep |
| `ANALYSIS_TIMEOUT` | 300000 | Analysis timeout (5 min) |
| `MAX_FILE_SIZE` | 10485760 | Max file size (10MB) |

### Logging Configuration

| Variable | Default | Description |
|---------|---------|-------------|
| `LOG_LEVEL` | info | Log level (error/warn/info/debug) |
| `LOG_FORMAT` | text | Log format (text/json) |
| `LOG_FILE` | | Log file path (optional) |

---

## Monitoring

### Health Checks

**Endpoint**: `GET /health`

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Logs

**Docker**:
```bash
docker-compose logs -f api
```

**PM2**:
```bash
pm2 logs code-assessment-api
```

**Systemd**:
```bash
journalctl -u code-assessment -f
```

### Metrics

Current metrics available:
- Request count (via logs)
- Error rate (via logs)
- Response time (via logs)

**Future**: Prometheus metrics endpoint will be added.

---

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Use NGINX or AWS ALB in front of multiple API instances

**NGINX Configuration** (`/etc/nginx/sites-available/code-assessment`):
```nginx
upstream code_assessment {
    least_conn;
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://code_assessment;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. **Session Affinity**: Not required (stateless API)

### Vertical Scaling

Increase resources:
- **CPU**: For faster analysis
- **RAM**: For larger repositories
- **Disk**: For caching and logs

### Docker Swarm / Kubernetes

**Docker Swarm**:
```bash
docker stack deploy -c docker-compose.yml code-assessment
```

**Kubernetes**: See `k8s/` directory for Kubernetes manifests (future).

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### 2. Docker Build Fails

```bash
# Clean build
docker-compose build --no-cache

# Check Docker logs
docker-compose logs
```

#### 3. GitHub API Rate Limiting

- Use GitHub Personal Access Token
- Implement request queuing for large batches
- Cache repository metadata

#### 4. Out of Memory

- Reduce `MAX_FILE_SIZE`
- Limit concurrent analyses
- Increase container memory limits

#### 5. External Scanners Not Found

If ESLint, Semgrep, or npm audit are not available:
- Install in Dockerfile or host system
- Set `USE_EXTERNAL_SCANNERS=false` to disable
- Pattern-based scanning will still work

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Database Connection Issues

If using PostgreSQL:
```bash
# Check connection
docker-compose exec postgres psql -U postgres -d code_assessment -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up -d
```

---

## Security Considerations

1. **GitHub Token**: Store in environment variables, never commit
2. **API Rate Limiting**: Configure appropriate limits
3. **CORS**: Restrict origins in production
4. **HTTPS**: Use reverse proxy (NGINX/Traefik) with SSL certificates
5. **Firewall**: Only expose necessary ports (80, 443)
6. **Updates**: Regularly update dependencies and base images

---

## Backup and Recovery

### Application Logs

Backup log files:
```bash
# Docker
docker cp code-assessment-api:/app/logs ./backup/logs-$(date +%Y%m%d)

# Manual
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

### Database (Future)

PostgreSQL backup:
```bash
docker-compose exec postgres pg_dump -U postgres code_assessment > backup-$(date +%Y%m%d).sql
```

Restore:
```bash
docker-compose exec -T postgres psql -U postgres code_assessment < backup-20240115.sql
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] GitHub token with appropriate scopes
- [ ] Docker images built and tested
- [ ] Health checks responding
- [ ] Logs being collected
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] HTTPS enabled (via reverse proxy)
- [ ] Monitoring set up
- [ ] Backup strategy defined
- [ ] Security review completed

---

## Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Test health endpoint: `curl http://localhost:3000/health`
4. Review troubleshooting section
5. Open issue on GitHub

---

## Next Steps

After deployment:
1. Run accuracy validation tests
2. Test with sample repositories
3. Monitor performance and errors
4. Set up alerting (future)
5. Configure automated backups (future)

