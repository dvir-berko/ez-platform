package main

import future.keywords.if
import future.keywords.in

# ── EZ Platform OPA Policies ────────────────────────────────────────────────
# These policies run against helm-rendered Kubernetes manifests
# to enforce platform standards before deploy.

# Rule: All containers must define resource requests
deny contains msg if {
    some container in input.spec.template.spec.containers
    not container.resources.requests
    msg := sprintf(
        "Container '%s' in Deployment '%s' must define resource requests",
        [container.name, input.metadata.name],
    )
}

# Rule: All containers must define resource limits
deny contains msg if {
    some container in input.spec.template.spec.containers
    not container.resources.limits
    msg := sprintf(
        "Container '%s' in Deployment '%s' must define resource limits",
        [container.name, input.metadata.name],
    )
}

# Rule: Containers must not run as root
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not input.spec.template.spec.securityContext.runAsNonRoot
    msg := sprintf(
        "Deployment '%s' must set securityContext.runAsNonRoot=true",
        [input.metadata.name],
    )
}

# Rule: Must have both liveness and readiness probes
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not container.livenessProbe
    msg := sprintf(
        "Container '%s' must define a livenessProbe",
        [container.name],
    )
}

deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not container.readinessProbe
    msg := sprintf(
        "Container '%s' must define a readinessProbe",
        [container.name],
    )
}

# Rule: Must not use 'latest' image tag
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    endswith(container.image, ":latest")
    msg := sprintf(
        "Container '%s' must not use the ':latest' tag in production",
        [container.name],
    )
}

# Rule: Image must come from approved registry (ECR, quay.io, ghcr.io for non-prod)
deny contains msg if {
    input.kind == "Deployment"
    some container in input.spec.template.spec.containers
    not startswith(container.image, "placeholder")         # allow policy-check rendering
    not contains(container.image, ".dkr.ecr.")
    not contains(container.image, "quay.io")               # approved external registries (non-prod only)
    not contains(container.image, "ghcr.io")
    msg := sprintf(
        "Container '%s' image must come from an approved registry",
        [container.name],
    )
}

# Rule: Production images must come from ECR only (quay.io / ghcr.io not allowed in prod)
deny contains msg if {
    input.kind == "Deployment"
    data.environment == "prod"
    some container in input.spec.template.spec.containers
    not startswith(container.image, "placeholder")         # allow policy-check rendering
    not contains(container.image, ".dkr.ecr.")
    msg := sprintf(
        "Container '%s' in production Deployment '%s' must use an ECR image (public registries not allowed in prod)",
        [container.name, input.metadata.name],
    )
}
