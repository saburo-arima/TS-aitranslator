import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';

console.log('Renderer process starting...');

const container = document.getElementById('root');
console.log('Container element:', container);

if (!container) {
  console.error('Root element not found!');
} else {
  const root = createRoot(container);
  console.log('Root created, rendering App component...');
  root.render(<App />);
  console.log('App rendered!');
} 