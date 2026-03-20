# EZ Platform UI Redesign Review

## Corrected project baseline

EZ Platform is a Backstage-based IDP with a service catalog and scaffolder, backed by reusable GitHub Actions workflows, ECR/EKS delivery via Helm, and observability integration (Prometheus/Grafana).

For MVP, CD is GitHub Actions + Helm. ArgoCD exists in the repo as optional/adjacent infra material, but the documented delivery default is not ArgoCD-first.

## Gaps in the original summary

1. The text said three complete pages were delivered, but no `index.html`, `service-detail.html`, or `create-service.html` files exist in the repository.
2. It positioned ArgoCD as central delivery, which conflicts with the documented MVP design.
3. It referred to Trivy-based gating, while the documented CI path centers on Syft SBOM + Grype scanning.
4. Several "live" UI claims were made without defining backing data contracts.

## Improved redesign statement

This redesign proposal includes three pages to implement next:

1. Dashboard page: platform KPIs, pipeline activity, active alerts, service catalog overview, and quick actions.
2. Service detail page: environment status, CI/CD timeline, observability metrics, security posture, and Kubernetes runtime state.
3. Create service wizard: Lite/Standard template selection, service config form, and generated file-tree preview.

Each live widget should be backed by an explicit integration contract (for example: GitHub Actions, Backstage catalog entities, Prometheus/Grafana, and security scan outputs), with defined refresh behavior and fallback states.

## Suggested implementation boundaries

- Keep this as a Backstage plugin/page implementation under `ez-platform/packages/app`, not standalone static HTML.
- Add typed adapter layers for each external source so UI can render from mocked fixtures in development.
- Start with read-only views first, then add mutating actions (for example, create service) once permissions and audit behavior are explicit.
