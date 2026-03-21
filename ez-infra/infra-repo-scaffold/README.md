# Infra Repo Scaffold

This directory shows the required structure for the separate `dvir-berko/infra` repository
that ArgoCD uses for environment-specific values overrides.

Create a new GitHub repository at `https://github.com/dvir-berko/infra` with this structure:

```
infra/
├── envs/
│   ├── dev/
│   │   └── values.yaml      # Dev environment overrides
│   ├── staging/
│   │   └── values.yaml      # Staging environment overrides
│   └── prod/
│       └── values.yaml      # Prod environment overrides
```

See the `envs/` subdirectories here for example values.yaml files.
