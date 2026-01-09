/**
 * @file main.jsx
 * @description Application entry point - React 18 initialization
 * Handles React root creation, service worker registration, and error boundaries
 * 
 * @author 26:07 Electronics
 * @version 2.0.0
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

/**
 * Application configuration
 * @constant {Object}
 */
const APP_CONFIG = {
  ROOT_ID: 'root',
  SW_PATH: '/sw.js',
  ENABLE_STRICT_MODE: true,
  ENABLE_SERVICE_WORKER: true,
};

// ==================== LOGGING ====================

console.log('🎯 main.jsx executing...');
console.log('📋 Environment:', import.meta.env.MODE || 'production');

// ==================== ROOT ELEMENT VERIFICATION ====================

/**
 * Get and verify the root element exists
 * @returns {HTMLElement} Root element
 * @throws {Error} If root element not found
 */
const getRootElement = () => {
  const rootElement = document.getElementById(APP_CONFIG.ROOT_ID);
  
  if (!rootElement) {
    console.error(`❌ CRITICAL: Root element #${APP_CONFIG.ROOT_ID} not found!`);
    displayCriticalError('Root element not found', 'The application container is missing from the HTML.');
    throw new Error('Root element not found');
  }
  
  console.log('✅ Root element found');
  return rootElement;
};

// ==================== ERROR DISPLAY ====================

/**
 * Display a critical error when app fails to initialize
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {Error} [error] - Optional error object
 */
const displayCriticalError = (title, message, error = null) => {
  const errorHtml = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      ">
        <h1 style="
          margin: 0 0 16px;
          color: #ef4444;
          font-size: 24px;
          font-weight: 700;
        ">
          ⚠️ ${title}
        </h1>
        <p style="
          margin: 0 0 20px;
          color: #64748b;
          font-size: 16px;
          line-height: 1.6;
        ">
          ${message}
        </p>
        ${error ? `
          <details style="
            margin: 20px 0;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          ">
            <summary style="
              cursor: pointer;
              color: #475569;
              font-weight: 600;
              font-size: 14px;
            ">
              Technical Details
            </summary>
            <pre style="
              margin: 12px 0 0;
              padding: 12px;
              background: white;
              border-radius: 6px;
              overflow: auto;
              font-size: 12px;
              color: #ef4444;
              font-family: 'Courier New', monospace;
              white-space: pre-wrap;
              word-wrap: break-word;
            ">${error.toString()}\n${error.stack || ''}</pre>
          </details>
        ` : ''}
        <button onclick="location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        " onmouseover="this.style.background='#1d4ed8'" 
           onmouseout="this.style.background='#2563eb'">
          🔄 Reload Application
        </button>
      </div>
    </div>
  `;
  
  document.body.innerHTML = errorHtml;
};

// ==================== SERVICE WORKER REGISTRATION ====================

/**
 * Register service worker for PWA functionality
 * Enables offline support and caching
 */
const registerServiceWorker = () => {
  if (!APP_CONFIG.ENABLE_SERVICE_WORKER) {
    console.log('⏭️ Service worker registration disabled');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service workers not supported in this browser');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(APP_CONFIG.SW_PATH)
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Service Worker update found');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ New content available, please refresh');
              // Could show a notification to user here
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
};

// ==================== REACT APPLICATION INITIALIZATION ====================

/**
 * Initialize and render the React application
 */
const initializeApp = () => {
  try {
    const rootElement = getRootElement();
    
    console.log('✅ Creating React root...');
    const root = createRoot(rootElement);
    
    console.log('✅ Rendering App component...');
    
    // Render with or without StrictMode based on config
    if (APP_CONFIG.ENABLE_STRICT_MODE) {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } else {
      root.render(<App />);
    }
    
    console.log('✅ App rendered successfully');
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR during React initialization:', error);
    displayCriticalError(
      'Application Failed to Start',
      'The application encountered an error during initialization.',
      error
    );
    throw error;
  }
};

// ==================== GLOBAL ERROR HANDLERS ====================

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  event.preventDefault();
  
  // Could send to error tracking service here
  if (import.meta.env.MODE === 'development') {
    console.error('Promise rejection details:', event);
  }
});

/**
 * Handle global errors
 */
window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
  
  // Could send to error tracking service here
  if (import.meta.env.MODE === 'development') {
    console.error('Error details:', event);
  }
});

// ==================== APP STARTUP ====================

// Initialize the application
initializeApp();

// Register service worker for PWA
registerServiceWorker();

// Log startup complete
console.log('🚀 Application startup complete');

// Development mode helpers
if (import.meta.env.MODE === 'development') {
  console.log('🔧 Development mode enabled');
  
  // Expose React DevTools
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  
  // Log performance metrics
  window.addEventListener('load', () => {
    if (window.performance && window.performance.timing) {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      
      console.log('⚡ Performance Metrics:');
      console.log(`  Page Load: ${pageLoadTime}ms`);
      console.log(`  Network: ${connectTime}ms`);
      console.log(`  Render: ${renderTime}ms`);
    }
  });
}

// Export for testing
export { initializeApp, registerServiceWorker, APP_CONFIG };
