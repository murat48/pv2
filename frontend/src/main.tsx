// Suppress wallet provider redefinition warnings - MUST BE FIRST
if (typeof window !== 'undefined') {
  const originalDefineProperty = Object.defineProperty;
  const originalDefineProperties = Object.defineProperties;
  
  Object.defineProperty = function(obj: any, prop: string, descriptor: any) {
    if (prop === 'ethereum' || prop === 'StacksProvider' || prop === 'StacksNetwork') {
      try {
        return originalDefineProperty.call(this, obj, prop, descriptor);
      } catch (e) {
        // Silently ignore provider redefinition errors
        return obj;
      }
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
  
  Object.defineProperties = function(obj: any, props: any) {
    const filtered: any = {};
    for (const key in props) {
      if (!['ethereum', 'StacksProvider', 'StacksNetwork'].includes(key)) {
        filtered[key] = props[key];
      }
    }
    
    try {
      return originalDefineProperties.call(this, obj, filtered);
    } catch (e) {
      return obj;
    }
  };
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
