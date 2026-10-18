import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { Agentation } from 'agentation';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
    <Agentation endpoint="http://localhost:4747" />
  </StrictMode>,
);
