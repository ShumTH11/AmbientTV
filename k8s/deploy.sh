#!/usr/bin/env bash
set -euo pipefail

# AmbientTV Kubernetes Deployment Script
# Usage: ./deploy.sh [environment] [tag]
#   environment: dev | staging | prod (default: dev)
#   tag: Docker image tag (default: latest)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-dev}"
TAG="${2:-latest}"
NAMESPACE="ambienttv"

echo "====================================="
echo "AmbientTV Kubernetes Deployment"
echo "Environment: $ENVIRONMENT"
echo "Image tag: $TAG"
echo "====================================="

# Check prerequisites
echo "[1/6] Checking prerequisites..."
command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed. Aborting."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "docker is required but not installed. Aborting."; exit 1; }

# Verify cluster connection
echo "[2/6] Verifying cluster connection..."
kubectl cluster-info >/dev/null 2>&1 || { echo "Cannot connect to Kubernetes cluster. Aborting."; exit 1; }

# Build and push Docker image
echo "[3/6] Building Docker image..."
cd "$SCRIPT_DIR/../backend"
docker build -t "ambienttv/backend:$TAG" .

# For production, push to registry
if [[ "$ENVIRONMENT" == "prod" || "$ENVIRONMENT" == "staging" ]]; then
    echo "[3.5/6] Pushing image to registry..."
    # Uncomment and configure for your registry:
    # docker tag "ambienttv/backend:$TAG" "your-registry.com/ambienttv/backend:$TAG"
    # docker push "your-registry.com/ambienttv/backend:$TAG"
    echo "WARNING: Registry push not configured. Set up your registry and uncomment push commands."
fi

# Apply Kustomize manifests
echo "[4/6] Applying Kubernetes manifests..."
cd "$SCRIPT_DIR"

# Update image tag in kustomization
if command -v kustomize >/dev/null 2>&1; then
    kustomize edit set image "ambienttv/backend:$TAG"
    kustomize build . | kubectl apply -f -
else
    # Fallback: use kubectl kustomize
    kubectl apply -k . --namespace "$NAMESPACE"
fi

# Wait for deployments
echo "[5/6] Waiting for deployments to be ready..."
kubectl rollout status deployment/ambienttv-redis -n "$NAMESPACE" --timeout=120s
kubectl rollout status deployment/ambienttv-backend -n "$NAMESPACE" --timeout=180s

# Verify health
echo "[6/6] Verifying health..."
BACKEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app=ambienttv-backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- wget --quiet --tries=1 --spider http://localhost:3000/api/health \
    && echo "Health check: OK" \
    || echo "Health check: FAILED"

echo ""
echo "====================================="
echo "Deployment complete!"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl logs -f deployment/ambienttv-backend -n $NAMESPACE"
echo "  kubectl get svc -n $NAMESPACE"
echo "  kubectl get ingress -n $NAMESPACE"
echo "====================================="
