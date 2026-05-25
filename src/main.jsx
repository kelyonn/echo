import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MqttProvider } from './context/MqttContext';
import { ToastProvider } from './context/ToastContext';
import ToastHost from './components/ToastHost';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <MqttProvider>
    <ToastProvider>
      <RouterProvider router={router} />
      <ToastHost />
    </ToastProvider>
  </MqttProvider>,
);
