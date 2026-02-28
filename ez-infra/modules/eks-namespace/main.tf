# ─────────────────────────────────────────────────────────────────────────────
# EZ Platform — EKS Namespace Module
#
# Creates Kubernetes namespace with:
#   - EZ platform labels
#   - ResourceQuota (prevents noisy-neighbor)
#   - LimitRange (default container limits)
#   - NetworkPolicy (deny all ingress by default, allow from same namespace + ingress)
# ─────────────────────────────────────────────────────────────────────────────

resource "kubernetes_namespace" "this" {
  metadata {
    name = var.namespace

    labels = {
      "ez.platform/managed"     = "true"
      "ez.platform/team"        = var.team
      "ez.platform/environment" = var.environment
    }

    annotations = {
      "ez.platform/created-by" = "terraform"
    }
  }
}

resource "kubernetes_resource_quota" "this" {
  metadata {
    name      = "ez-quota"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"       = var.quota_requests_cpu
      "requests.memory"    = var.quota_requests_memory
      "limits.cpu"         = var.quota_limits_cpu
      "limits.memory"      = var.quota_limits_memory
      "pods"               = var.quota_max_pods
      "services"           = "20"
      "persistentvolumeclaims" = "10"
    }
  }
}

resource "kubernetes_limit_range" "this" {
  metadata {
    name      = "ez-limits"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    limit {
      type = "Container"
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }
    limit {
      type = "Pod"
      max  = {
        cpu    = "4"
        memory = "8Gi"
      }
    }
  }
}

# Default-deny network policy — only allow within namespace and from ingress controller
resource "kubernetes_network_policy" "default_deny" {
  metadata {
    name      = "default-deny-ingress"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    pod_selector {}  # Selects all pods
    policy_types = ["Ingress"]

    ingress {
      # Allow traffic from within the same namespace
      from {
        pod_selector {}
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = kubernetes_namespace.this.metadata[0].name
          }
        }
      }
    }

    ingress {
      # Allow traffic from ingress controller namespace
      from {
        namespace_selector {
          match_labels = {
            "kubernetes.io/metadata.name" = "ingress-nginx"
          }
        }
      }
    }
  }
}
