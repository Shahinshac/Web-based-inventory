# Frontend Error Handling Guide

## Overview

The API utility (`api.js`) now distinguishes between different error types:
- **Authentication errors (401)** - Session expired, invalid token
- **Authorization errors (403)** - Insufficient permissions
- **Network errors** - Connection failures, timeouts
- **Server errors (5xx)** - Backend issues
- **Client errors (4xx)** - Invalid requests, not found

## Error Object Structure

All API errors now include:
```javascript
{
  message: string,        // User-friendly error message
  details: string,        // Server error details
  status: number,         // HTTP status code
  isAuthError: boolean,   // True if 401 Unauthorized
  isNetworkError: boolean, // True if connection failed
  endpoint: string        // Which API endpoint failed
}
```

## Helper Functions

### 1. Check if error is authentication error
```javascript
import { isAuthError } from './utils/api.js';

if (isAuthError(error)) {
  // Redirect to login
  window.location.href = '/login';
}
```

### 2. Check if error is network error
```javascript
import { isNetworkError } from './utils/api.js';

if (isNetworkError(error)) {
  setError('Connection lost. Retrying...');
  // Optionally retry the request
}
```

### 3. Get user-friendly error message
```javascript
import { getErrorMessage } from './utils/api.js';

try {
  const data = await apiGet('/api/products');
} catch (error) {
  const message = getErrorMessage(error);
  showError(message); // Shows: "Session expired..." or "Server error..." etc
}
```

### 4. Get full error details (for debugging)
```javascript
import { getErrorDetails } from './utils/api.js';

try {
  const data = await apiGet('/api/products');
} catch (error) {
  const details = getErrorDetails(error);
  console.log(details);
  // {
  //   message: 'Session expired or invalid. Please login again.',
  //   details: 'Invalid or expired token',
  //   status: 401,
  //   isAuthError: true,
  //   isNetworkError: false,
  //   endpoint: '/api/products'
  // }
}
```

## Component Implementation Examples

### Example 1: Handle different error types
```javascript
import { apiGet, isAuthError, isNetworkError, getErrorMessage } from './utils/api.js';

const MyComponent = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const result = await apiGet('/api/invoices');
      setData(result);
      setError(null);
    } catch (err) {
      if (isAuthError(err)) {
        // Redirect to login
        setError('Please login again.');
        // window.location.href = '/login';
      } else if (isNetworkError(err)) {
        setError('Connection lost. Please check your internet.');
      } else {
        setError(getErrorMessage(err));
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {data && <div>{/* render data */}</div>}
      <button onClick={fetchData}>Load Data</button>
    </div>
  );
};
```

### Example 2: Show specific messages
```javascript
const handleCreateProduct = async (productData) => {
  try {
    const result = await apiPost('/api/products', productData);
    showNotification('Product created successfully!');
  } catch (error) {
    if (isAuthError(error)) {
      showError('Session expired. Please login again.', 'warning');
      // Optionally redirect to login page
    } else if (error.status === 404) {
      showError('API endpoint not found. Please contact support.');
    } else if (error.status >= 500) {
      showError('Server error. Please try again later.');
    } else if (isNetworkError(error)) {
      showError('Network error. The backend may be unreachable.');
    } else {
      showError(getErrorMessage(error));
    }
  }
};
```

### Example 3: Handle timeouts
```javascript
const handleFileUpload = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const result = await apiUpload('/api/uploads', formData);
    return { success: true, url: result.url };
  } catch (error) {
    if (error.message.includes('timeout')) {
      return { success: false, error: 'Upload took too long. Please try again.' };
    }
    return { success: false, error: getErrorMessage(error) };
  }
};
```

## Console Logging

All API errors are logged with the `[api]` prefix for easy debugging. Example console output:
```
[api] GET https://backend.example.com/api/invoices
[api] Token present: true
[api] Session expired or invalid. Please login again. Authentication failed
[api] Error for /api/invoices: Error: Session expired or invalid. Please login again.
```

## Status Code Mappings

| Status | Error Type | Message |
|--------|-----------|---------|
| 400    | Bad Request | API error: 400 |
| 401    | Unauthorized | Session expired or invalid. Please login again. |
| 403    | Forbidden | You do not have permission to access this resource. |
| 404    | Not Found | Resource not found (/endpoint) |
| 500    | Server Error | Server error. Please try again later. |
| 502    | Bad Gateway | Server error. Please try again later. |
| 503    | Service Unavailable | Server error. Please try again later. |
| 504    | Gateway Timeout | Server error. Please try again later. |
| Network | Connection Error | Unable to connect to server. The backend may be unreachable or waking up. |
| Timeout | Request Timeout | Request timeout. The server is taking too long to respond. |

## Migration Guide

### Before (old error handling):
```javascript
try {
  const data = await apiGet('/api/invoices');
} catch (error) {
  // All errors showed: "Unable to connect to server"
  setError(error.message);
}
```

### After (new error handling):
```javascript
try {
  const data = await apiGet('/api/invoices');
} catch (error) {
  if (isAuthError(error)) {
    // Handle session expired
    redirectToLogin();
  } else if (isNetworkError(error)) {
    // Handle connection lost
    setError('Connection lost. Please try again.');
  } else {
    // Show appropriate error message
    setError(getErrorMessage(error));
  }
}
```

## Debugging Tips

1. **Check console logs** with `[api]` prefix to see:
   - Which endpoint was called
   - Whether token was present
   - Exact error message and details

2. **Use getErrorDetails()** in DevTools to get full error object:
   ```javascript
   const error = lastError; // from catch block
   console.table(getErrorDetails(error));
   ```

3. **Check localStorage** for token:
   ```javascript
   console.log('Token:', localStorage.getItem('authToken'));
   ```

4. **Check backend health**:
   - Open backend URL in browser
   - Should show: `{ "api": "healthy" }`
   - If fails: Backend is down or unreachable
