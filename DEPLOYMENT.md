# Deployment Guide

This guide will help you deploy the Inventory Management System to Vercel (frontend) and Render (backend).

## Prerequisites

1. **GitHub Account**: Your code should be in a GitHub repository
2. **MongoDB Atlas Account**: Free tier is sufficient
3. **Vercel Account**: Free tier available
4. **Render Account**: Free tier available

## Step 1: MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user (remember username and password)
4. In Network Access, add IP `0.0.0.0/0` to allow all IPs (or use Render's IP ranges)
5. Click "Connect" → "Connect your application"
6. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
7. Add your database name: `mongodb+srv://username:password@cluster.mongodb.net/inventorydb?retryWrites=true&w=majority`

## Step 2: Deploy Backend to Render

1. **Sign up/Login to Render**: [render.com](https://render.com)

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select your repository

3. **Configure Service**:
   - **Name**: `inventory-api` (or your choice)
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `web-app/server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid if you prefer)

4. **Environment Variables**:
   Click "Environment" tab and add:
   ```
   NODE_ENV=production
   PORT=4000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventorydb?retryWrites=true&w=majority
   DB_NAME=inventorydb
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password-here
   ALLOW_ADMIN_PASSWORD_CHANGE=false # set to true only if you explicitly want to allow changing admin password via API
   UNSPLASH_ACCESS_KEY=your-key-here (optional)
   ```
   Replace with your actual values.

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Once deployed, copy your service URL (e.g., `https://inventory-api.onrender.com`)

## Step 3: Deploy Frontend to Vercel

1. **Sign up/Login to Vercel**: [vercel.com](https://vercel.com)

2. **Create New Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository

3. **Configure Project**:
   - **Project Name**: `inventory-manager` (or your choice)
   - **Root Directory**: `web-app/client`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Note**: If you add a `vercel.json` file (recommended for cache headers and SW), ensure it includes `{ "handle": "filesystem" }` before the catch-all route so static `assets/` and `sw.js` are served correctly.

4. **Environment Variables**:
   Click "Environment Variables" and add:
   ```
   VITE_API_URL=https://inventory-api.onrender.com
   VITE_ADMIN_PASSWORD=YourSecurePasswordHere  # optional local fallback - not recommended for production
   ```
   Replace with your actual Render backend URL.

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

## Step 4: Verify Deployment

1. **Test Backend**:
   - Visit: `https://your-backend-url.onrender.com/api/ping`
   - Should return: `{"ok":true}`

2. **Test Frontend**:
   - Visit your Vercel URL
   - Try logging in with admin credentials
   - Default admin username: `admin`
   - Default admin password: (what you set in `ADMIN_PASSWORD`). Note: password changes via the API/web UI are disabled by default — set `ALLOW_ADMIN_PASSWORD_CHANGE=true` if you need the API enabled (not recommended for production).

## Troubleshooting

### Backend Issues

#### ❌ Error: "Server localhost:27017 error" or "Connection attempt failed"

**Problem**: The `MONGODB_URI` environment variable is not set in Render, so it's trying to connect to localhost.

**Solution**:
1. Go to your Render service dashboard
2. Click on **"Environment"** tab (in the left sidebar)
3. Click **"Add Environment Variable"**
4. Add these **REQUIRED** variables:

   ```
   Key: MONGODB_URI
   Value: mongodb+srv://username:password@cluster.mongodb.net/inventorydb?retryWrites=true&w=majority
   ```
   
   Replace with your actual MongoDB Atlas connection string.

5. Also add these required variables:
   ```
   NODE_ENV=production
   PORT=4000
   DB_NAME=inventorydb
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password-here
   ALLOW_ADMIN_PASSWORD_CHANGE=false
   ```

6. Click **"Save Changes"**
7. Render will automatically redeploy your service

**How to get MongoDB Atlas connection string**:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `inventorydb` (or add `?retryWrites=true&w=majority` at the end)

#### Connection Timeout
- Check MongoDB Atlas **Network Access** settings
- Add `0.0.0.0/0` to allow all IPs (or use Render's IP ranges)
- Ensure your MongoDB cluster is running (not paused)

#### Database Connection Failed
- Verify `MONGODB_URI` is correct (check for typos)
- Ensure password in connection string is URL-encoded if it contains special characters
- Check MongoDB Atlas cluster status

#### Build Failed
- Check Render logs for npm install errors
- Verify Node.js version compatibility (requires Node 18+)

### Frontend Issues

- **API Calls Failing**: Verify `VITE_API_URL` matches your Render backend URL
- **CORS Errors**: Backend should have CORS enabled (already configured)
- **Build Failed**: Check Vercel logs for build errors

## Updating Deployments

### Backend Updates
- Push changes to GitHub
- Render will automatically redeploy

### Frontend Updates
- Push changes to GitHub
- Vercel will automatically redeploy

## Custom Domain (Optional)

### Render
- Go to your service settings
- Add custom domain in "Custom Domains" section

### Vercel
- Go to project settings
- Add domain in "Domains" section
- Configure DNS as instructed

## Environment Variables Reference

### Backend (Render)
```
NODE_ENV=production
PORT=4000
MONGODB_URI=your-mongodb-connection-string
DB_NAME=inventorydb
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ALLOW_ADMIN_PASSWORD_CHANGE=false
UNSPLASH_ACCESS_KEY=optional-unsplash-key
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend-url.onrender.com
VITE_ADMIN_PASSWORD=YourSecurePasswordHere
```

## Notes

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid plan for always-on service
- Vercel free tier is generous and doesn't spin down

## Photo URL migration

If you have existing user or product photos saved as relative paths or DB-backed 'db:<id>' entries, you can convert them into fully-qualified server-backed URLs by calling the admin migration endpoint. This will rewrite the `photo` field on existing users and products to use the stable API endpoints.

POST /api/admin/migrate-photo-urls

POST /api/admin/update-company-phone
   - Description: Update the `companyPhone` field across all existing bills/invoices in the database.
   - Request Body: { adminUsername, adminPassword, companyPhone }
   - Response: { success: true, message: 'Updated X invoices with companyPhone Y' }
   - Notes: Requires admin credentials (username and password). The endpoint will audit the change.
- Body (JSON): { "adminUsername": "admin", "adminPassword": "your_admin_password" }
- Response: { success: true, usersUpdated: <n>, productsUpdated: <m> }

   Run this once on the backend after deploying to ensure old images are consistently referenced by the frontend across devices.

   If you want to fully migrate filesystem-backed photos into DB storage (recommended), use the new CLI:

   ```
   cd web-app/server
   npm run migrate-photos-to-db -- --delete-files
   ```

   This will insert images into `product_images` and `user_images` collections, update `photo`, `photoDbId` and `photoStorage` fields, and optionally delete filesystem copies when `--delete-files` is used. Use `--dry-run` to preview changes.

