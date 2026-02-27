/**
 * Server Entry Point
 * Minimal server startup file - imports app and starts listening
 */

const bcrypt = require('bcrypt');
const app = require('./app');
const { connectDB, getDB } = require('./db');
const logger = require('./logger');
const { ADMIN_USERNAME, ADMIN_PASSWORD, PORT } = require('./config/constants');
const { isConfigured: isCloudinaryConfigured } = require('./services/cloudinaryService');

/**
 * Initialize admin user on server startup
 */
async function initializeAdminUser() {
  try {
    const db = getDB();
    const usersCollection = db.collection('users');
    
    // Get admin credentials from environment variables
    const adminUsername = ADMIN_USERNAME;
    const adminPassword = ADMIN_PASSWORD;
    
    if (!adminPassword) {
      logger.warn('ADMIN_PASSWORD is not set — skipping creation of a default admin account. Ensure an admin user exists in the DB.');
      return;
    }
    
    // Check if admin account exists
    const existingAdmin = await usersCollection.findOne({ username: adminUsername });
    
    if (!existingAdmin) {
      // Create admin account
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await usersCollection.insertOne({
        username: adminUsername,
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'admin',
        approved: true,
        createdAt: new Date(),
        sessionVersion: 1,
        isDefault: true
      });
      
      logger.info(`✅ Created admin user: ${adminUsername}`);
    } else {
      // Admin exists — only update password if env var has changed (avoids overwriting manual changes)
      if (existingAdmin.isDefault) {
        const passwordUnchanged = await bcrypt.compare(adminPassword, existingAdmin.password);
        if (!passwordUnchanged) {
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          await usersCollection.updateOne(
            { username: adminUsername },
            { $set: { password: hashedPassword } }
          );
          logger.info(`✅ Updated admin password for: ${adminUsername}`);
        } else {
          logger.info(`ℹ️  Admin user unchanged: ${adminUsername}`);
        }
      } else {
        logger.info(`ℹ️  Admin user already exists: ${adminUsername}`);
      }
    }
    
  } catch (error) {
    logger.error('Error initializing admin user:', error);
  }
}

/**
 * Start the Express server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected successfully');
    
    // Initialize admin user
    await initializeAdminUser();
    
    // Start listening
    const port = PORT;
    app.listen(port, () => {
      logger.info(`🚀 Inventory API listening on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📍 Server URL: http://localhost:${port}`);

      // Warn operators if Cloudinary is not configured (images won't upload)
      if (isCloudinaryConfigured()) {
        logger.info('☁️  Cloudinary image storage: configured ✅');
      } else {
        logger.warn('⚠️  Cloudinary image storage: NOT configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment variables');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
