# 🚀 Cursor → GitHub → Vercel Auto-Deploy Setup

This guide will enable Cursor to push code changes that automatically deploy to Vercel.

## 📋 Prerequisites

- [ ] GitHub account with repository access
- [ ] Vercel account (free tier works)
- [ ] Cursor IDE with project open

---

## Step 1: Connect GitHub Repo to Vercel

### 1.1 Go to Vercel Dashboard
1. Visit [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Click **"Import Git Repository"**

### 1.2 Import Your Repository
1. Find and select your **resonai** repository
2. Click **"Import"**

### 1.3 Configure Build Settings
Vercel should auto-detect Next.js, but verify:
- **Framework Preset**: `Next.js`
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (already in vercel.json)
- **Output Directory**: `.next` (already in vercel.json)
- **Install Command**: `npm install` (default)

### 1.4 Deploy
1. Click **"Deploy"**
2. Wait for build to complete
3. Note your live URL (e.g., `https://resonai-xxx.vercel.app`)

✅ **Result**: Any push to `main` branch will now auto-deploy!

---

## Step 2: Enable Cursor to Push to GitHub

### 2.1 Create GitHub Personal Access Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Configure token:
   - **Note**: `Cursor IDE - Resonai Project`
   - **Expiration**: `90 days` (or your preference)
   - **Scopes**: Check only `repo` (full control of private repositories)
4. Click **"Generate token"**
5. **Copy the token** (you won't see it again!)

### 2.2 Configure Git Credentials in Cursor

Run these commands in Cursor's terminal:

```bash
# Set up remote origin (if not already set)
git remote -v

# If no origin, add it:
git remote add origin https://github.com/YOUR_USERNAME/resonai.git

# Configure credential helper
git config credential.helper store

# Test the connection
git push origin main
```

When prompted:
- **Username**: `YOUR_GITHUB_USERNAME`
- **Password**: `YOUR_PERSONAL_ACCESS_TOKEN` (not your GitHub password!)

### 2.3 Verify Setup

```bash
# Check remote is configured
git remote -v

# Test push (should work without prompting)
git push origin main
```

✅ **Result**: Cursor can now push to GitHub!

---

## Step 3: Test the Full Pipeline

### 3.1 Make a Test Change
In Cursor, make a small change (e.g., update a comment):

```bash
# Make a change
echo "<!-- Test deployment -->" >> app/layout.tsx

# Commit and push
git add .
git commit -m "test: verify auto-deployment pipeline"
git push origin main
```

### 3.2 Verify Auto-Deployment
1. Go to your Vercel dashboard
2. Check the **"Deployments"** tab
3. You should see a new deployment starting
4. Wait for it to complete (usually 1-2 minutes)
5. Visit your live site to see the change

✅ **Result**: Full Cursor → GitHub → Vercel pipeline working!

---

## Step 4: (Optional) Vercel CLI Setup

If you want Cursor to deploy directly without GitHub:

### 4.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 4.2 Authenticate Once
```bash
vercel login
```
Follow the browser authentication flow.

### 4.3 Test Direct Deployment
```bash
vercel --prod
```

✅ **Result**: Cursor can now deploy directly to Vercel!

---

## 🔧 Troubleshooting

### Issue: "Authentication failed" when pushing
**Solution**: 
- Double-check your Personal Access Token
- Ensure token has `repo` scope
- Try: `git config --global credential.helper store`

### Issue: "Repository not found" 
**Solution**:
- Verify repository name and username
- Check if repository is private and token has access
- Try: `git remote set-url origin https://github.com/USERNAME/REPO.git`

### Issue: Vercel not auto-deploying
**Solution**:
- Check Vercel dashboard for webhook status
- Verify repository is connected in Vercel
- Check build logs for errors

### Issue: Build fails on Vercel
**Solution**:
- Check `vercel.json` configuration
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

---

## 🎯 Success Checklist

- [ ] Repository connected to Vercel
- [ ] First deployment successful
- [ ] GitHub Personal Access Token created
- [ ] Git credentials configured in Cursor
- [ ] Test push from Cursor works
- [ ] Auto-deployment triggered on push
- [ ] Live site updates with changes

---

## 🚀 You're All Set!

Now Cursor can:
- ✅ Push code changes to GitHub
- ✅ Trigger automatic Vercel deployments
- ✅ Deploy directly with `vercel --prod` (if CLI setup)

**Next time**: Just commit and push in Cursor, and your changes will be live in minutes!
