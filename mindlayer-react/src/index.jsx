import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext';
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <FirebaseAuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </FirebaseAuthProvider>
  </React.StrictMode>
);
