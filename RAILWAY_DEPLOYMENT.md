# Railway Deployment Guide for Flask Inventory App

## Prerequisites
- GitHub account
- Railway account (sign up at https://railway.app)
- Your code pushed to GitHub

## Step 1: Prepare Your Repository

Your app is already configured with:
- ✅ `Procfile` - Tells Railway how to run your app
- ✅ `requirements.txt` - Python dependencies
- ✅ `railway.json` - Railway configuration
- ✅ `runtime.txt` - Python version specification

## Step 2: Sign Up for Railway

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign in with your GitHub account
4. Authorize Railway to access your repositories

## Step 3: Deploy Your App

### Option A: Deploy from GitHub (Recommended)

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `Shahinshac/Web-based-inventory`
4. Railway will automatically detect it's a Python app
5. Select the `python-app` directory as the root
6. Click **"Deploy"**

### Option B: Deploy with Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Navigate to your app directory
cd python-app

# Initialize Railway project
railway init

# Deploy
railway up
```

## Step 4: Configure Environment Variables

In Railway Dashboard → Your Project → Variables, add:

```env
# Required Variables
FLASK_SECRET_KEY=your-super-secret-key-here-change-this
FLASK_ENV=production

# Database (SQLite works by default, but use PostgreSQL for production)
DATABASE_URL=sqlite:///inventory.db

# Optional: Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

### To Generate a Secret Key:
```python
python -c "import secrets; print(secrets.token_hex(32))"
```

## Step 5: Add PostgreSQL Database (Recommended)

1. In Railway Dashboard → Your Project
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway automatically creates a `DATABASE_URL` variable
4. Update your `config.py` to use PostgreSQL:

```python
import os

# Use DATABASE_URL from environment (Railway PostgreSQL)
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///inventory.db')

# Convert postgres:// to postgresql:// if needed (for SQLAlchemy)
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
```

5. Add PostgreSQL adapter to `requirements.txt`:
```
psycopg2-binary==2.9.9
```

## Step 6: Configure Root Directory

If Railway doesn't auto-detect the `python-app` folder:

1. Go to **Settings** → **Root Directory**
2. Set it to: `python-app`
3. Click **"Save"**

## Step 7: Domain Setup

Railway provides a free domain:

1. Go to **Settings** → **Domains**
2. Click **"Generate Domain"**
3. You'll get a URL like: `https://your-app.up.railway.app`

### Custom Domain (Optional):
1. Click **"Custom Domain"**
2. Enter your domain (e.g., `inventory.yourdomain.com`)
3. Add CNAME record in your DNS:
   ```
   CNAME: inventory.yourdomain.com → your-app.up.railway.app
   ```

## Step 8: Monitor Your Deployment

1. Check **Deployments** tab for build logs
2. View **Metrics** for usage statistics
3. Check **Logs** for application logs

## Important Files Created

### 1. `Procfile`
```
web: gunicorn app:app
```
Tells Railway to use Gunicorn to serve your Flask app.

### 2. `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "gunicorn app:app",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```
Railway-specific configuration for build and deployment.

### 3. `runtime.txt`
```
3.11
```
Specifies Python version.

## Troubleshooting

### Build Fails
- Check that `python-app` is set as root directory
- Verify all dependencies are in `requirements.txt`
- Check build logs in Railway dashboard

### App Crashes
- Check application logs in Railway dashboard
- Verify environment variables are set correctly
- Ensure `SECRET_KEY` is configured

### Database Issues
- For SQLite: Files are ephemeral on Railway, use PostgreSQL
- For PostgreSQL: Ensure `psycopg2-binary` is in requirements.txt
- Check `DATABASE_URL` is properly formatted

### Port Issues
Railway automatically assigns PORT variable. Your app should use:
```python
port = int(os.environ.get('PORT', 5000))
app.run(host='0.0.0.0', port=port)
```

## Updating Your App

Railway auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update application"
git push origin main
```

Railway will automatically rebuild and deploy.

## Cost Estimation

**Free Tier:**
- $5 free credit monthly (500 execution hours)
- 512 MB RAM
- 1 GB disk
- Perfect for development/small projects

**Hobby Plan: $5/month**
- $5 credit monthly + usage-based billing
- 8 GB RAM
- 100 GB disk
- Suitable for production apps

## Useful Commands

```bash
# View logs
railway logs

# Open app in browser
railway open

# Run commands in production environment
railway run python app.py

# Link to existing project
railway link

# Check service status
railway status
```

## Next Steps

1. ✅ Deploy your app
2. ✅ Add PostgreSQL database
3. ✅ Configure environment variables
4. ✅ Test your application
5. Set up custom domain (optional)
6. Enable monitoring and alerts
7. Set up backups for your database

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

**Your app is now ready to deploy on Railway! 🚀**

To deploy, simply:
1. Push your code to GitHub
2. Connect Railway to your repository
3. Railway will handle the rest automatically
