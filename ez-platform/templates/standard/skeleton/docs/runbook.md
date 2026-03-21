# Runbook — ${{ values.name }}

**Severity owner:** ${{ values.team }}
**Service tier:** Standard (DB-backed)

---

## High CPU / Memory

1. `kubectl top pods -n ${{ values.namespace }}`
2. `kubectl get hpa -n ${{ values.namespace }}`
3. Manually scale: `kubectl scale deployment/${{ values.name }} --replicas=N -n ${{ values.namespace }}`

---

## Failed Deployment

Helm `--atomic` auto-rolls back. To check:

```bash
helm history ${{ values.name }} -n ${{ values.namespace }}
kubectl get events -n ${{ values.namespace }} --sort-by='.lastTimestamp'
kubectl logs -l app.kubernetes.io/name=${{ values.name }} -n ${{ values.namespace }} --previous
```

---

## Database Connection Failures

1. Check ExternalSecret is synced: `kubectl get externalsecret -n ${{ values.namespace }}`
2. Check the K8s secret exists: `kubectl get secret ${{ values.name }}-secrets -n ${{ values.namespace }}`
3. Verify the environment-specific secret in AWS Secrets Manager contains `database_url`.

---

## Rollback

```bash
helm rollback ${{ values.name }} -n ${{ values.namespace }}
```

---

## Escalation

Slack: `#${{ values.team }}-oncall`
