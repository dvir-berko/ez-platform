output "namespace" { value = kubernetes_namespace.this.metadata[0].name }
output "namespace_uid" { value = kubernetes_namespace.this.metadata[0].uid }
