# ─────────────────────────────────────────────────────────────────────────────
# EZ Platform — EKS Namespace Module
#
# Creates Kubernetes namespace with:
#   - EZ platform labels
#   - ResourceQuota (prevents noisy-neighbor)
#   - LimitRange (default container limits)
#   - NetworkPolicy (deny all ingress by default, allow same namespace, ingress controllers,
#     and private VPC source ranges)
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
      "requests.cpu"           = var.quota_requests_cpu
      "requests.memory"        = var.quota_requests_memory
      "limits.cpu"             = var.quota_limits_cpu
      "limits.memory"          = var.quota_limits_memory
      "pods"                   = var.quota_max_pods
      "services"               = "20"
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
      max = {
        cpu    = "4"
        memory = "8Gi"
      }
    }
  }
}

# Default-deny network policy — allow same-namespace traffic, common ingress controllers,
# and VPC-private sources so ALB/NLB-backed workloads still function.
resource "kubernetes_network_policy" "default_deny" {
  metadata {
    name      = "default-deny-ingress"
    namespace = kubernetes_namespace.this.metadata[0].name
  }

  spec {
    pod_selector {} # Selects all pods
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

    ingress {
      # Allow traffic from ALB/NLB data paths inside typical VPC ranges.
      from {
        ip_block {
          cidr = "10.0.0.0/8"
        }
      }
      from {
        ip_block {
          cidr = "172.16.0.0/12"
        }
      }
      from {
        ip_block {
          cidr = "192.168.0.0/16"
        }
      }
    }
  }
}
