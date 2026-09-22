/**
 * @file src/client/main.tsx
 * @description Client bootstrap entry point, membungkus root dengan AuthProvider dan me-mount ke DOM.
 * @layer Client Bootstrap Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { AuthProvider } from './hooks/useAuth.js';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}
