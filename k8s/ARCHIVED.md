# Kubernetes Deployment (Archived)

This directory contains Kubernetes manifests that were created but are no longer the recommended deployment method. Docker Compose is preferred for simplicity.

## Why Docker over Kubernetes?

- **Simplicity**: Single host, no cluster management
- **Cost**: No control plane fees
- **SQLite**: Single-node database doesn't benefit from K8s orchestration
- **Debugging**: Direct access to containers and logs

## Files

| File | Description |
|------|-------------|
| `namespace.yaml` | Namespace `ambienttv` |
| `configmap.yaml` | Non-sensitive configuration |
| `secret.yaml` | Secrets template (NEVER commit with real values) |
| `redis-deployment.yaml` | Redis cache |
| `redis-service.yaml` | Redis ClusterIP service |
| `backend-deployment.yaml` | Node.js backend (2 replicas) |
| `backend-service.yaml` | Backend ClusterIP service |
| `ingress.yaml` | Nginx ingress + TLS |
| `hpa.yaml` | Horizontal Pod Autoscaler |
| `network-policy.yaml` | Network isolation |
| `kustomization.yaml` | Kustomize configuration |
| `deploy.sh` | Deployment script |
| `helm/` | Helm chart |

## If you still want Kubernetes

```bash
cd k8s

# Edit secrets and domain first!
vim secret.yaml
vim ingress.yaml

# Deploy
kubectl apply -k .

# Or with Helm
cd helm
helm install ambienttv ./ambienttv -f values.yaml
```

## Migration to Docker

```bash
# Export data from K8s
kubectl cp ambienttv/ambienttv-backend-xxx:/app/data/ambienttv.db ./ambienttv.db

# Stop K8s
kubectl delete -k k8s/

# Start Docker
docker-compose up -d

# Import data
docker cp ./ambienttv.db ambienttv-backend:/app/data/ambienttv.db
```
