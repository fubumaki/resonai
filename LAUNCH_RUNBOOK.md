# 🚀 Pilot Launch Runbook

## T-1 Day (Pre-Launch)

### Deploy to Staging
- [ ] Merge green main → staging deploy
- [ ] Run E2E smoke test:
  ```powershell
  npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox
  ```
- [ ] Sanity scan `/analytics`: confirm non-zero **TTV samples**, **Mic grant ≥85%** on staging
- [ ] Verify feature flags work on staging environment

## T-0 (Launch Day)

### Initial Rollout (10%)
- [ ] Set `PILOT_ROLLOUT_PCT=0.10` and redeploy
- [ ] Announce in #launch with `/analytics` KPIs link and killswitch location
- [ ] Monitor for 15 minutes for any immediate issues

### First Hour Check (T+60 min)
- [ ] Check KPIs: TTV p50 ≤ 2s, p90 ≤ 5s; Mic grant ≥ 85%; Activation ≥ 40%
- [ ] If healthy, bump `PILOT_ROLLOUT_PCT=0.20` (20% rollout)
- [ ] Continue monitoring for next hour

## Daily Operations (D1–D7)

### Daily Health Checks
- [ ] Review nightly root-config job + step summary
- [ ] Export `/api/events?limit=200` snapshot for historical notes
- [ ] Check `/analytics` dashboard for anomalies
- [ ] Verify CI/CD pipelines are green

### Weekly Scale-Up (if healthy)
- **Week 1**: 20% → 50% if KPIs stable
- **Week 2**: 50% → 100% if no issues

## 🔄 Rollback Procedures

### Emergency Killswitch
```powershell
# Set to 0% (complete rollback)
$env:PILOT_ROLLOUT_PCT = "0"
# redeploy/restart command here
```

### Feature-Specific Rollback
- **Mic Grant Issue**: If mic-grant dips >10% vs control, flip E2 to native prompt for all
- **Performance Issue**: If TTV p90 > 5s consistently, rollback to 10% and investigate
- **Activation Issue**: If activation <40%, check analytics events and user flow

## 📊 Acceptance Thresholds

### Must-Have Metrics
- **TTV P50** ≤ **2s**; **P90** ≤ **5s**
- **Mic Grant** ≥ **85%**
- **Activation** ≥ **40%**

### Warning Signs
- TTV p90 > 8s (investigate immediately)
- Mic grant < 80% (check permission primer effectiveness)
- Activation < 35% (review user flow and copy)
- Error rate > 5% (check server logs and analytics)

## 🛠️ Operator Tools

### Quick KPI Check
```powershell
# Triage snapshot (Windows PowerShell)
iwr http://localhost:3003/api/events?limit=50 -UseBasicParsing | Select -Expand Content
```

### Flag Change (Platform Examples)
```powershell
# Azure/Render/Heroku examples vary
$env:PILOT_ROLLOUT_PCT = "0.20"
# redeploy/restart command here
```

### Health Check
```powershell
# Server health
iwr http://localhost:3003/api/healthz -UseBasicParsing
```

## 📞 Escalation

### P0 (Critical - < 5 min response)
- Complete service outage
- Security breach
- Data loss

### P1 (High - < 30 min response)
- Performance degradation >50%
- Feature not working for >10% users
- Analytics pipeline down

### P2 (Medium - < 2 hours)
- Minor performance issues
- Edge case bugs
- Monitoring alerts

## 📋 Launch Checklist

### Pre-Launch
- [ ] All tests green (local + CI)
- [ ] Staging deployment successful
- [ ] Analytics dashboard accessible
- [ ] Killswitch tested and documented
- [ ] Team notified of launch window

### Launch
- [ ] 10% rollout initiated
- [ ] Monitoring dashboards active
- [ ] Team on standby for first hour
- [ ] Communication channels open

### Post-Launch
- [ ] 1-hour health check completed
- [ ] 20% rollout if healthy
- [ ] Daily monitoring schedule established
- [ ] Weekly review meetings scheduled

---

**Remember**: Start small, monitor closely, scale gradually. The pilot is designed to be safe and reversible at every step.
