# 🚀 Staging Deployment Guide

## Prerequisites
- ✅ Build passes (`npm run build`)
- ✅ All TypeScript errors fixed
- ✅ Core functionality implemented
- ✅ Analytics pipeline ready

## Step 1: Deploy to Staging

### Option A: Use PowerShell Script (Recommended)
```powershell
# Run the staging deployment script
.\scripts\deploy-staging.ps1
```

### Option B: Manual Deployment
```powershell
# Set environment variables
$env:PILOT_ROLLOUT_PCT = "0.10"  # 10% initial rollout
$env:NODE_ENV = "production"

# Build and start
npm run build
npm run start
```

## Step 2: Verify Deployment

### Run Staging Tests
```powershell
# Run the staging test script
.\scripts\test-staging.ps1
```

### Manual Verification
1. **Health Check**: Visit `http://localhost:3003/api/healthz`
2. **Analytics**: Visit `http://localhost:3003/analytics`
3. **Home Page**: Visit `http://localhost:3003/`

## Step 3: Test Pilot Features

### Set Up Test Environment
1. **Open browser dev tools**
2. **Set pilot cohort cookie**:
   ```javascript
   document.cookie = "pilot_cohort=pilot; path=/";
   ```
3. **Set feature flags**:
   ```javascript
   localStorage.setItem('ff.instantPractice', 'true');
   localStorage.setItem('ff.permissionPrimerShort', 'true');
   ```
4. **Visit**: `http://localhost:3003/try`

### Expected Behavior
- ✅ Page loads without Next.js error overlay
- ✅ "Start with voice" button visible
- ✅ Microphone permission flow works
- ✅ Analytics events are generated

## Step 4: Monitor KPIs

### Check Analytics Dashboard
Visit `http://localhost:3003/analytics` to monitor:
- **TTV P50/P90**: Should be ≤ 2s/5s
- **Mic Grant %**: Should be ≥ 85%
- **Activation %**: Should be ≥ 40%

### Server Logs
Watch for analytics events in the console:
```
[events] +3 (schema=v1)
```

## Step 5: Scale Rollout

### After 60 Minutes (if healthy)
```powershell
# Increase to 20% rollout
$env:PILOT_ROLLOUT_PCT = "0.20"
# Restart server or redeploy
```

### Weekly Scale-Up (if healthy)
- **Week 1**: 20% → 50%
- **Week 2**: 50% → 100%

## Rollback Procedures

### Emergency Killswitch
```powershell
# Complete rollback (0% traffic)
$env:PILOT_ROLLOUT_PCT = "0"
# Restart server
```

### Feature-Specific Rollback
- **Mic Grant Issue**: Switch E2 to native prompt (E2B)
- **Performance Issue**: Rollback to 10% and investigate

## Troubleshooting

### Common Issues

#### Next.js Error Overlay
- **Cause**: Runtime error in `/try` page
- **Fix**: Check browser console for specific error
- **Workaround**: Ensure pilot cohort cookie and feature flags are set

#### Analytics Not Flowing
- **Check**: `/api/events` endpoint accessibility
- **Verify**: Rate limiting not blocking requests
- **Monitor**: Server logs for analytics events

#### Pilot Cohort Not Working
- **Verify**: Cookie is set correctly (`pilot_cohort=pilot`)
- **Check**: Middleware is running
- **Test**: Different browser/incognito mode

### Debug Commands
```powershell
# Check server status
curl http://localhost:3003/api/healthz

# Test analytics endpoint
curl http://localhost:3003/api/events?limit=5

# Check pilot cohort
# In browser console:
document.cookie
```

## Production Readiness Checklist

- [ ] Build passes without errors
- [ ] Staging tests pass
- [ ] Analytics dashboard shows data
- [ ] Pilot cohort gating works
- [ ] Feature flags functional
- [ ] Rate limiting active
- [ ] Error handling robust
- [ ] Rollback procedures tested

## Next Steps After Staging

1. **Monitor for 24 hours**
2. **Collect baseline metrics**
3. **Test edge cases**
4. **Prepare production deployment**
5. **Set up monitoring alerts**
6. **Train operations team**

---

**Remember**: Start small (10%), monitor closely, scale gradually. The pilot is designed to be safe and reversible at every step.
