import logging
from utils.tzutils import utc_now

logger = logging.getLogger(__name__)

def log_audit(db, action, user_id, username, details=None):
    """
    Python equivalent of the Node.js audit logging service.
    Records critical security and application actions into 'audit_logs'.
    All timestamps are stored in UTC with timezone awareness.
    """
    if details is None:
        details = {}

    try:
        if db is None:
            logger.warning("📝 Audit log skipped: No database connection available.")
            return

        log_entry = {
            "action": action,
            "userId": user_id,
            "username": username,
            "details": details,
            "timestamp": utc_now()
        }
        
        db.audit_logs.insert_one(log_entry)
        
    except Exception as e:
        logger.error(f"❌ Failed to write audit log: {e}")
