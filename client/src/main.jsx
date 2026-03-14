import React    from 'react';
import ReactDOM from 'react-dom/client';
import App      from './App.jsx';

// No StrictMode — it double-invokes useEffect and breaks P2P
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);