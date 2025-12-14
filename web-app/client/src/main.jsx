import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

console.log('🎯 main.jsx executing...')

// Verify root element exists
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ CRITICAL: Root element not found!')
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: system-ui, -apple-system, sans-serif;
      color: white;
      padding: 20px;
      text-align: center;
    ">
      <div style="background: rgba(0,0,0,0.2); padding: 40px; border-radius: 12px;">
        <h1 style="margin: 0 0 16px;">❌ Critical Error</h1>
        <p style="margin: 0;">Root element (#root) not found in HTML</p>
        <button onclick="location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        ">Reload Page</button>
      </div>
    </div>
  `
  throw new Error('Root element not found')
}

console.log('✅ Root element found, creating React root...')

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

try {
  const root = createRoot(rootElement)
  console.log('✅ React root created, rendering App...')
  root.render(<App />)
  console.log('✅ App render initiated')
} catch (error) {
  console.error('❌ CRITICAL ERROR during React render:', error)
  rootElement.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
    ">
      <div style="background: white; padding: 40px; border-radius: 12px; max-width: 500px;">
        <h1 style="margin: 0 0 16px; color: #ef4444;">⚠️ Render Error</h1>
        <p style="margin: 0 0 20px; color: #64748b;">Failed to initialize React application</p>
        <pre style="
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
          overflow: auto;
          font-size: 12px;
          color: #ef4444;
        ">${error.toString()}</pre>
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
        ">Reload Page</button>
      </div>
    </div>
  `
  throw error
}
