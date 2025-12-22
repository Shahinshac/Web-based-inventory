# Database Management

This directory contains scripts and utilities for managing the inventory database.

## Clear Database Script

The `clear-database.js` script allows you to safely clear all or specific parts of your database.

### Usage

#### Clear all data (keeps admin users)
```bash
npm run clear-db
```

#### Clear everything including admins
```bash
npm run clear-db-full
```

#### Clear specific collections
```bash
npm run clear-products      # Clear only products
npm run clear-customers     # Clear only customers
```

#### Direct script usage with options
```bash
node scripts/clear-database.js [options]
```

### Options

- `--keep-admin` - Keep admin users (default)
- `--full` - Delete everything including admin users
- `--products` - Clear only products and product images
- `--customers` - Clear only customers
- `--invoices` - Clear only invoices/bills
- `--users` - Clear only non-admin users
- `--photos` - Clear only uploaded photo files
- `--help`, `-h` - Show help message

### Examples

```bash
# Clear all data but keep admins (safest option)
node scripts/clear-database.js

# Clear everything including admins
node scripts/clear-database.js --full

# Clear only products
node scripts/clear-database.js --products

# Clear products and customers
node scripts/clear-database.js --products --customers

# Clear only uploaded photos
node scripts/clear-database.js --photos
```

## API Endpoints

### Clear All Data
**DELETE** `/api/admin/clear-all-data`

Clears all database collections while preserving admin users. Also removes uploaded photo files.

**Response:**
```json
{
  "success": true,
  "message": "All data cleared successfully",
  "results": {
    "products": 150,
    "customers": 75,
    "bills": 320,
    "invoices": 320,
    "expenses": 45,
    "audit_logs": 1200,
    "users": 5,
    "product_images": 150,
    "user_images": 5,
    "photos": 155
  },
  "total": 2425,
  "timestamp": "2025-12-01T10:30:00.000Z"
}
```

### Reset Database
**POST** `/api/admin/reset-database`

Clears all data and reinitializes database indexes.

**Response:**
```json
{
  "success": true,
  "message": "Database reset and reinitialized successfully",
  "timestamp": "2025-12-01T10:30:00.000Z"
}
```

### Database Statistics
**GET** `/api/admin/database-stats`

Get comprehensive database statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "products": 150,
    "customers": 75,
    "bills": 320,
    "invoices": 320,
    "expenses": 45,
    "audit_logs": 1200,
    "users": {
      "total": 6,
      "admins": 1,
      "managers": 2,
      "cashiers": 3
    },
    "product_images": 150,
    "user_images": 6,
    "database": {
      "size": 5242880,
      "storageSize": 10485760,
      "collections": 10,
      "indexes": 25
    }
  }
}
```

## What Gets Cleared

### Collections Cleared
- ✅ **products** - All product records
- ✅ **customers** - All customer records
- ✅ **bills** - All bill/invoice records
- ✅ **invoices** - All invoice records
- ✅ **expenses** - All expense records
- ✅ **audit_logs** - All audit log entries
- ✅ **product_images** - All product image metadata
- ✅ **user_images** - All user image metadata
- ✅ **users** - Non-admin users only (unless --full flag)

### Files Cleared
- ✅ **uploads/products/** - Product photos
- ✅ **uploads/users/** - User photos
- ✅ **uploads/profiles/** - Profile photos

### What's Preserved (default)
- ✅ **Admin users** - Admin accounts remain intact
- ✅ **Database structure** - Collections and indexes preserved
- ✅ **Configuration** - Server configuration unchanged

## Safety Features

1. **Confirmation Required** - Script requires typing "YES" to confirm
2. **Admin Preservation** - Admin users kept by default
3. **Detailed Logging** - All operations logged with counts
4. **Error Handling** - Graceful error handling with rollback
5. **Summary Report** - Detailed summary of what was deleted

## Recovery

⚠️ **Warning:** Once data is deleted, it cannot be recovered unless you have a backup.

### Creating a Backup
```bash
# MongoDB backup (if local)
mongodump --db inventorydb --out ./backup-$(date +%Y%m%d)

# MongoDB Atlas backup
# Use Atlas UI to create a snapshot before clearing
```

## Troubleshooting

### Script won't connect
- Check `MONGODB_URI` in `.env` file
- Verify MongoDB is running
- Check network/firewall settings

### Permission errors
- Ensure script has execute permissions: `chmod +x scripts/clear-database.js`
- Check file system permissions for uploads directory

### Photos not deleting
- Verify uploads directory path
- Check file permissions
- Ensure no files are in use

## Maintenance Schedule

### Recommended Schedule
- **Development:** Clear test data weekly
- **Staging:** Reset before major testing
- **Production:** Only clear with proper backups and approval

### Pre-Production Checklist
- [ ] Backup database
- [ ] Verify backup integrity
- [ ] Schedule maintenance window
- [ ] Notify users
- [ ] Test restore procedure
- [ ] Document what will be cleared
- [ ] Get approval from stakeholders

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error messages in terminal
3. Verify database connection
4. Check environment variables

---

**Last Updated:** December 2025
