# 🚀 AUTOMATED DEPLOYMENT SCRIPT
# Web-based Inventory System - Production Deploy
# Generated: 2026-01-09

## PREREQUISITES COMPLETED ✓
- [x] MongoDB Atlas database configured
- [x] Environment variables set
- [x] Frontend built successfully
- [x] Vercel CLI installed

## DEPLOYMENT STEPS

### Option 1: ONE-COMMAND DEPLOY (RECOMMENDED) 🎯

#### Deploy Backend to Render (Manual - First Time)
1. Go to: https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: inventory-backend
   - Root Directory: `web-app/server`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=4000
   MONGODB_URI=mongodb+srv://shahinshac_123_db_user:yFOAgORaSqy4TKgV@ac-3fra56h.majmsqd.mongodb.net/inventorydb?retryWrites=true&w=majority
   DB_NAME=inventorydb
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=SecurePass2026!
   ALLOW_ADMIN_PASSWORD_CHANGE=false
   CORS_ORIGIN=*
   JWT_SECRET=prod-secret-key-change-this-12345
   ```

6. Click "Create Web Service"
7. Copy your backend URL: `https://inventory-backend-xxxx.onrender.com`

#### Deploy Frontend to Vercel (Automated)
```powershell
# Navigate to client folder
cd web-app/client

# Login to Vercel (only first time)
vercel login

# Deploy to production
vercel --prod

# When prompted:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? inventory-frontend
# - Directory? ./
# - Override settings? N
```

After deploy, update the frontend environment variable:
```powershell
vercel env add VITE_API_URL production
# Enter: https://inventory-backend-xxxx.onrender.com/api
```

Redeploy with new env:
```powershell
vercel --prod
```

### Option 2: DEPLOY BUTTONS (EASIEST) 🔘

#### Backend - Deploy to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/YOUR_REPO)

#### Frontend - Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO/tree/main/web-app/client)

### Option 3: INSTALL RENDER CLI & AUTOMATE

```powershell
# Install Render CLI
npm install -g @render/cli

# Login
render login

# Deploy backend
cd web-app/server
render up

# Deploy frontend (already have Vercel CLI)
cd ../client
vercel --prod
```

## POST-DEPLOYMENT VERIFICATION

### Test Backend:
```powershell
# Replace with your Render URL
curl https://inventory-backend-xxxx.onrender.com/api/ping
# Expected: {"ok":true}
```

### Test Frontend:
```powershell
# Replace with your Vercel URL
curl https://inventory-frontend-xxxx.vercel.app
# Expected: 200 OK
```

### Test Integration:
1. Open: https://inventory-frontend-xxxx.vercel.app
2. Login with: admin / SecurePass2026!
3. Check dashboard loads

## MONGODB ATLAS NETWORK ACCESS FIX

⚠️ **IMPORTANT**: Your MongoDB is currently blocking connections.

To fix:
1. Go to: https://cloud.mongodb.com/
2. Navigate to: Network Access
3. Add IP Address: `0.0.0.0/0` (Allow from anywhere)
   - **Production**: Add only Render's IP ranges
   - **Development**: You can use 0.0.0.0/0 temporarily

## ENVIRONMENT VARIABLES SUMMARY

### Backend (.env)
```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://shahinshac_123_db_user:yFOAgORaSqy4TKgV@ac-3fra56h.majmsqd.mongodb.net/inventorydb?retryWrites=true&w=majority
DB_NAME=inventorydb
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SecurePass2026!
ALLOW_ADMIN_PASSWORD_CHANGE=false
CORS_ORIGIN=*
JWT_SECRET=prod-secret-key-change-this-12345
```

### Frontend (.env)
```env
VITE_API_URL=https://inventory-backend-xxxx.onrender.com/api
```

## QUICK START COMMANDS

```powershell
# From project root:

# 1. Deploy Frontend to Vercel
cd web-app/client
vercel --prod

# 2. Get backend URL from Render dashboard
# 3. Update frontend with backend URL:
vercel env add VITE_API_URL production
# Paste: https://your-backend.onrender.com/api

# 4. Redeploy frontend:
vercel --prod

# Done! 🎉
```

## TROUBLESHOOTING

### Issue: MongoDB Connection Failed
**Solution**: Add `0.0.0.0/0` to MongoDB Atlas Network Access

### Issue: CORS Error
**Solution**: Update `CORS_ORIGIN` in backend env vars to your frontend URL

### Issue: 404 on API Routes
**Solution**: Ensure `VITE_API_URL` includes `/api` at the end

### Issue: Login Failed
**Solution**: Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` match

## MONITORING

### Backend Health Check:
```
https://inventory-backend-xxxx.onrender.com/api/ping
```

### Frontend:
```
https://inventory-frontend-xxxx.vercel.app
```

### Logs:
- Backend: https://dashboard.render.com → Your Service → Logs
- Frontend: https://vercel.com → Your Project → Deployments

---

## 🎯 READY TO DEPLOY NOW!

**Fastest Path:**
```powershell
cd web-app/client
vercel --prod
```

Then configure backend via Render dashboard: https://dashboard.render.com/

**Your app will be live in ~5 minutes!** 🚀
