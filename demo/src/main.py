"""
ez-demo — EZ Platform Demo Service

A fully resolved EZ Lite service showing what gets generated
when a developer uses the Golden Path.

Team:  platform
Tier:  lite (stateless)
"""
import logging
import os

from fastapi import FastAPI
import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ez-demo",
    description="EZ Platform demo service — showcasing the Golden Path output",
    version=os.getenv("APP_VERSION", "demo"),
)


@app.get("/healthz", include_in_schema=False)
def healthz():
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/readyz", include_in_schema=False)
def readyz():
    """Readiness probe."""
    return {"status": "ready"}


@app.get("/")
def root():
    return {
        "service":     "ez-demo",
        "team":        "platform",
        "version":     os.getenv("APP_VERSION", "demo"),
        "env":         os.getenv("APP_ENV", "local"),
        "description": "EZ Platform Golden Path demo service",
        "golden_path": {
            "tier":      "lite",
            "template":  "ez-lite-service",
            "portal":    "https://portal.ez.internal",
            "docs":      "https://github.com/dvir-berko/ez-platform",
        },
    }


@app.get("/golden-path")
def golden_path():
    """Returns a summary of everything the EZ Golden Path provisions."""
    return {
        "what_you_get": [
            "GitHub repo scaffolded from template",
            "CI: build → test → SBOM → image scan → push to ECR",
            "CD: helm deploy to EKS (dev auto, prod gated)",
            "Kubernetes: Deployment + HPA + PDB + NetworkPolicy",
            "Security: OIDC auth, non-root container, read-only filesystem",
            "Observability: /healthz, /readyz, Prometheus-ready",
            "TechDocs + Runbook stub",
            "Backstage catalog registration",
        ],
        "repositories": {
            "ez-platform":  "Backstage portal + service templates",
            "ez-workflows": "Reusable CI/CD/IaC GitHub Actions",
            "ez-infra":     "Terraform: ECR, IAM OIDC, EKS namespaces, RDS",
        },
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
