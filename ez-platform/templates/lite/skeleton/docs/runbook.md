# Runbook — ${{ values.name }}

**Severity owner:** ${{ values.team }}
**On-call:** [PagerDuty rotation](https://pagerduty.com)
**Service tier:** Lite

---

## High CPU / Memory

**Symptoms:** HPA is at max replicas, pod OOMKilled.

**Steps:**
1. Check current resource usage: `kubectl top pods -n ${{ values.namespace }}`
2. Check HPA status: `kubectl get hpa -n ${{ values.namespace }}`
3. Review recent deployments for regressions
4. If stuck: manually scale — `kubectl scale deployment/${{ values.name }} --replicas=N -n ${{ values.namespace }}`

---

## Failed Deployment

**Symptoms:** CD workflow failed, pods in CrashLoopBackOff.

**Steps:**
1. Check pod logs: `kubectl logs -l app.kubernetes.io/name=${{ values.name }} -n ${{ values.namespace }} --previous`
2. Check events: `kubectl get events -n ${{ values.namespace }} --sort-by='.lastTimestamp'`
3. Helm will have auto-rolled back (atomic deploy). Verify: `helm history ${{ values.name }} -n ${{ values.namespace }}`
4. Fix the issue and push a new commit or tag.

---

## Service Unavailable / 503

**Symptoms:** Ingress returns 503 for all requests.

**Steps:**
1. Check pod readiness: `kubectl get pods -n ${{ values.namespace }} -l app.kubernetes.io/name=${{ values.name }}`
2. Check readiness probe: `kubectl describe pod <pod> -n ${{ values.namespace }}`
3. Check service endpoints: `kubectl get endpoints ${{ values.name }} -n ${{ values.namespace }}`

---

## Rollback

```bash
# List releases
helm history ${{ values.name }} -n ${{ values.namespace }}

# Rollback to previous revision
helm rollback ${{ values.name }} -n ${{ values.namespace }}
```

---

## Escalation

1. Team Slack: `#${{ values.team }}-oncall`
2. PagerDuty escalation policy: `${{ values.team }}`
