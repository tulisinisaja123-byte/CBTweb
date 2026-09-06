import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import 'katex/dist/katex.min.css';

// Guard against unhandled cross-origin noise in iframe environment
window.onerror = function () {
  return true;
};

window.addEventListener('error', (event) => {
  if (event && (event.message === 'Script error.' || !event.message)) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event) {
    event.preventDefault();
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
