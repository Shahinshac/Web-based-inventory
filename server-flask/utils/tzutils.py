"""
Timezone utility module for consistent UTC timestamp handling.
All timestamps should be:
1. Generated in UTC with timezone awareness
2. Stored in MongoDB as UTC datetime objects
3. Returned to frontend in ISO 8601 format
4. Displayed in frontend as Asia/Kolkata (IST)
"""

from datetime import datetime, timezone, timedelta

def utc_now():
    """Get current time in UTC with timezone awareness.

    ALWAYS use this instead of datetime.utcnow() which is deprecated
    and not timezone-aware.

    Returns:
        datetime: Current UTC time with timezone info
        Example: 2026-04-02 15:30:45.123456+00:00
    """
    return datetime.now(timezone.utc)


def utc_from_iso(iso_string):
    """Parse ISO 8601 string to UTC datetime object.

    Args:
        iso_string (str): ISO formatted timestamp string

    Returns:
        datetime: Parsed UTC datetime object
    """
    if isinstance(iso_string, datetime):
        return iso_string
    try:
        dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
        return dt.astimezone(timezone.utc)
    except (ValueError, AttributeError):
        return None


def to_iso_string(dt):
    """Convert datetime object to ISO 8601 string.

    Args:
        dt (datetime): Datetime object to convert

    Returns:
        str: ISO formatted string (e.g., "2026-04-02T15:30:45.123456+00:00")
    """
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt

    # Ensure timezone aware
    if dt.tzinfo is None:
        # Assume UTC if naive
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.isoformat()


def utc_to_ist(dt):
    """Convert UTC datetime to India Standard Time (IST / Asia/Kolkata).

    IST is UTC+5:30 (no DST)

    Args:
        dt (datetime): UTC datetime object (or naive datetime)

    Returns:
        datetime: Datetime in IST timezone
        Example: 2026-04-02 21:00:45.123456+05:30
    """
    if dt is None:
        return None

    if isinstance(dt, str):
        dt = utc_from_iso(dt)

    # IST is UTC+5:30
    ist_offset = timezone(timedelta(hours=5, minutes=30))

    # Ensure timezone aware (assume UTC if naive)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Convert to IST
    return dt.astimezone(ist_offset)


def format_ist_date(dt):
    """Format datetime in IST as date string: '02 Apr 2026'

    Args:
        dt (datetime): UTC datetime object

    Returns:
        str: Formatted date string
    """
    if dt is None:
        return 'N/A'

    ist_dt = utc_to_ist(dt)
    return ist_dt.strftime('%d %b %Y')


def format_ist_time(dt):
    """Format datetime in IST as time string: '08:15 PM'

    Args:
        dt (datetime): UTC datetime object

    Returns:
        str: Formatted time string
    """
    if dt is None:
        return 'N/A'

    ist_dt = utc_to_ist(dt)
    return ist_dt.strftime('%I:%M %p')


def format_ist_datetime(dt):
    """Format datetime in IST as full datetime: '02 Apr 2026 08:15 PM'

    Args:
        dt (datetime): UTC datetime object

    Returns:
        str: Formatted datetime string
    """
    if dt is None:
        return 'N/A'

    ist_dt = utc_to_ist(dt)
    return ist_dt.strftime('%d %b %Y %I:%M %p')


def utc_plus_days(days=0, hours=0, minutes=0):
    """Get UTC time offset by days, hours, or minutes.

    Args:
        days (int): Days to add
        hours (int): Hours to add
        minutes (int): Minutes to add

    Returns:
        datetime: UTC datetime offset by specified amount
    """
    return utc_now() + timedelta(days=days, hours=hours, minutes=minutes)


def is_expired(expiry_datetime):
    """Check if a datetime has expired.

    Args:
        expiry_datetime (datetime): Expiry timestamp to check

    Returns:
        bool: True if expired, False otherwise
    """
    if expiry_datetime is None:
        return False

    # Ensure timezone aware for comparison
    if expiry_datetime.tzinfo is None:
        expiry_datetime = expiry_datetime.replace(tzinfo=timezone.utc)

    return utc_now() > expiry_datetime


def days_until(target_datetime):
    """Calculate days remaining until target datetime.

    Args:
        target_datetime (datetime): Target timestamp

    Returns:
        int: Number of days until target (negative if already passed)
    """
    if target_datetime is None:
        return None

    # Ensure timezone aware
    if target_datetime.tzinfo is None:
        target_datetime = target_datetime.replace(tzinfo=timezone.utc)

    delta = target_datetime - utc_now()
    return delta.days
