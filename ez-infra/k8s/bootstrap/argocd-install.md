# ArgoCD Bootstrap

## Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd
```

## Get initial admin password

```bash
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d
```

## Grant ArgoCD access to infra repo

Option A — GitHub Deploy Key:
```bash
argocd repo add https://github.com/dvir-berko/infra --username git --password <GITHUB_PAT>
```

Option B — GitHub App (recommended for orgs)

## Apply Application manifests

```bash
kubectl apply -f /path/to/ez-platform/ez-infra/argocd/apps.yaml
```

## Verify

```bash
argocd app list
```
