# Environment Variables Reference

## Backend (Render)

Copy these into your Render service environment variables:

```bash
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventorydb?retryWrites=true&w=majority
DB_NAME=inventorydb
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password-here
ALLOW_ADMIN_PASSWORD_CHANGE=false
UNSPLASH_ACCESS_KEY=your-unsplash-key-here
```

### Variable Descriptions:

- **NODE_ENV**: Set to `production` for production deployment
- **PORT**: Server port (default: 4000, Render will override with its own port)
- **MONGODB_URI**: Your MongoDB Atlas connection string
- **DB_NAME**: Database name (default: `inventorydb`)
- **ADMIN_USERNAME**: Default admin username (created on first startup)
- **ADMIN_PASSWORD**: Default admin password (change this!)
- **UNSPLASH_ACCESS_KEY**: (Optional) Unsplash API key for auto-fetching product images
 - **ALLOW_ADMIN_PASSWORD_CHANGE**: When `true`, the server API allows changing the admin password via the API. Default is `false` and recommended for production.

## Server-side password helper

You may want to change the stored admin password directly on the server without enabling the web change endpoint.

- The repo includes a helper script: `web-app/server/scripts/change-admin-password.js`
- You can supply the new password via the `NEW_ADMIN_PASSWORD` environment variable, CLI `--password`, or the script will prompt you interactively.
- Example: `ADMIN_USERNAME=admin NEW_ADMIN_PASSWORD='S3cure' node web-app/server/scripts/change-admin-password.js --logoutAll`

## Frontend (Vercel)

Copy this into your Vercel project environment variables:

```bash
VITE_API_URL=https://your-backend-url.onrender.com

# Optional local dev admin fallback (not recommended for production)
VITE_ADMIN_PASSWORD=YourSecurePasswordHere
```

### Variable Descriptions:

- **VITE_API_URL**: Your Render backend service URL (e.g., `https://inventory-api.onrender.com`)

## Local Development

### Backend (.env file in `web-app/server/`)

```bash
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017
DB_NAME=inventorydb
ADMIN_USERNAME=admin
ADMIN_PASSWORD=defaultpass123
UNSPLASH_ACCESS_KEY=your-unsplash-key-here
```

### Frontend (.env file in `web-app/client/`)

```bash
VITE_API_URL=http://localhost:4000
VITE_ADMIN_PASSWORD=YourSecurePasswordHere
```

## Getting MongoDB Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with `inventorydb` (or your preferred database name)

Example:
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/inventorydb?retryWrites=true&w=majority
```

## Security Notes

⚠️ **Important**: 
- Never commit `.env` files to Git
- Use strong passwords for `ADMIN_PASSWORD` in production
- Keep your MongoDB credentials secure
- Rotate passwords regularly

