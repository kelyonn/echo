import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import your global styles
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MqttProvider } from './context/MqttContext';
import { ToastProvider } from './context/ToastContext';
import { IdentityProvider } from './context/IdentityContext';
import ToastHost from './components/ToastHost';

// Set up React Router
const router = createBrowserRouter([
  {
    path: '/', // Root path
    element: <App />, // Main App component for this route
  },
]);

// Render the app with Router
ReactDOM.createRoot(document.getElementById('root')).render(
  <IdentityProvider>
    <MqttProvider>
      <ToastProvider>
        <RouterProvider router={router} /> {/* Router for page navigation */}
        <ToastHost />
      </ToastProvider>
    </MqttProvider>
  </IdentityProvider>,
);
