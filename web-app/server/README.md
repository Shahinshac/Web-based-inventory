# Server scripts and operational helper

This folder contains utility scripts that help perform admin and maintenance actions against the server database.

## Quick Deploy (Render + MongoDB Atlas) 🚀

1. **Create Render Web Service**
   - Root Directory: `web-app/server`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

2. **Required Environment Variables**
   ```
   NODE_ENV=production
   PORT=4000
   MONGODB_URI=your-mongodb-connection-string
   DB_NAME=inventorydb
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-password
   ```

3. **Verify**
   - After deploy, check `GET /api/ping` → `{"ok":true}` and ensure API routes work from your frontend.

> Tip: While testing, allow Atlas network access `0.0.0.0/0` or use Render's IP ranges; restrict access in production.


## change-admin-password.js

Purpose: safely update the stored admin user's password in the database and optionally invalidate (log out) all sessions.

Key features:
- Uses existing DB connector `connectDB` (web-app/server/db.js). Works with your existing MONGODB_URI and DB_NAME environment variables.
- Hashes the new password with bcrypt before storing it.
- Increments `sessionVersion` on the admin user and (optionally) all users to force remote session invalidation.
- Writes an audit log into `audit_logs` (best-effort).

Usage (examples):

Run with password and username flags:

  node scripts/change-admin-password.js --username admin --password "S3cureP@ssw0rd" --logoutAll

Using environment variables (recommended when running on host/CI):

  ADMIN_USERNAME=admin NEW_ADMIN_PASSWORD="S3cureP@ssw0rd" node scripts/change-admin-password.js --logoutAll

Or use the script interactively (it will prompt for the password):

  node scripts/change-admin-password.js --username admin --logoutAll

Security notes:
- Do NOT run this from an untrusted machine. Ensure MONGODB_URI is only accessible on an admin host.
- Prefer setting the password as an environment variable for automated runs (avoid shell history). If you must pass via CLI, be aware CLI arguments may be visible to other processes on the host.
- The script will always increment sessionVersion on the changed admin user. Use `--logoutAll` to force logout for all users too.

If you want me to run this against your server DB for you, give me the new password and confirm you want to invalidate all sessions — I will not run any DB changes unless you explicitly approve and provide runtime access (credentials / environment) in a secure way.

## clear-db-except-products.js

Purpose: safely delete all data from all collections except `products`. This helps reset the database while keeping product catalog intact.

Key features:
- Dry-run mode by default — shows which collections would be cleared without making changes.
- Requires explicit confirmation to execute destructive deletes. Use `--confirm`, `--interactive` or set `CLEAR_DB_CONFIRM=true` in the environment to run for real.
- Writes an `audit_logs` entry recording what was deleted.

Usage examples:

  # Dry-run (default): shows what would be deleted
  node scripts/clear-db-except-products.js

  # Actual destructive operation (non-interactive):
  CLEAR_DB_CONFIRM=true node scripts/clear-db-except-products.js --confirm

  # Interactive confirmation:
  node scripts/clear-db-except-products.js --interactive

Security notes: Always create a DB backup before running any destructive script and only run this on a trusted admin host that has access to your MongoDB connection string.
