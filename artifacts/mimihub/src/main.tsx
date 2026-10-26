import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';

type BoundaryState = { error: Error | null };

class StorefrontErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MimiiHub storefront render error]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const message = this.state.error.message || String(this.state.error);
      return (
        <main style={{ minHeight: '100vh', boxSizing: 'border-box', padding: '32px 20px', background: '#faf6f0', color: '#30291f', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: 720, margin: '10vh auto', background: '#fffdf9', border: '1px solid #e7d9c3', borderRadius: 16, padding: 24 }}>
            <p style={{ color: '#9a6b13', fontWeight: 700, letterSpacing: '.12em', fontSize: 12 }}>MIMIIHUB STOREFRONT DIAGNOSTICS</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, margin: '12px 0' }}>The storefront hit an error</h1>
            <p style={{ lineHeight: 1.6 }}>The website could not finish rendering. This diagnostic is here so we can identify the cause instead of showing a blank page.</p>
            <h2 style={{ fontSize: 14, marginTop: 24 }}>Error message</h2>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#f5eee3', borderRadius: 8, padding: 14, fontSize: 13 }}>{message}</pre>
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Technical details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12, maxHeight: 260, overflow: 'auto' }}>{this.state.error.stack || 'No stack trace was provided.'}</pre>
            </details>
            <button onClick={() => window.location.reload()} style={{ marginTop: 20, border: 0, borderRadius: 8, background: '#30291f', color: '#fff', padding: '12px 18px', cursor: 'pointer' }}>Reload website</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function showRuntimeError(title: string, detail: string) {
  console.error(title, detail);
  let panel = document.getElementById('mimihub-runtime-error');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'mimihub-runtime-error';
    panel.style.cssText = 'position:fixed;z-index:2147483647;inset:12px;overflow:auto;background:#fffdf9;color:#30291f;border:2px solid #b88619;border-radius:12px;padding:20px;font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;';
    document.body.appendChild(panel);
  }
  panel.textContent = title + '\\n\\n' + detail;
}

window.addEventListener('error', (event) => {
  // Ignore failed image/font/resource loads; report JavaScript errors only.
  if (!event.error && !event.message) return;
  const detail = event.error instanceof Error ? (event.error.stack || event.error.message) : event.message;
  showRuntimeError('MimiiHub browser error', detail || 'Unknown browser error');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const detail = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
  showRuntimeError('MimiiHub unhandled promise rejection', detail);
});

const root = document.getElementById('root');
if (!root) {
  showRuntimeError('MimiiHub startup error', 'The HTML page does not contain the #root element.');
} else {
  createRoot(root).render(
    <StorefrontErrorBoundary>
      <App />
    </StorefrontErrorBoundary>,
  );
}
