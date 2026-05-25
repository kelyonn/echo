import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import mqtt from 'mqtt';

function getStableClientId() {
  let id = localStorage.getItem('echo_cid');
  if (!id) {
    id = `echo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('echo_cid', id);
  }
  return id;
}

const MqttContext = createContext(null);

export const MqttProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError]   = useState(null);
  const clientRef           = useRef(null);

  const connect = useCallback((username) => {
    const mqttUrl      = (import.meta.env.VITE_MQTT_BROKER_URL || import.meta.env.VITE_MQTT_URL || '').trim();
    const mqttUsername = (import.meta.env.VITE_MQTT_USERNAME || '').trim();
    const mqttPassword = (import.meta.env.VITE_MQTT_PASSWORD || '').trim();

    if (!mqttUrl || !mqttUsername || !mqttPassword) {
      const err = new Error('MQTT environment variables are not set.');
      setError(err);
      setStatus('error');
      return Promise.reject(err);
    }

    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
      setClient(null);
    }

    setStatus('connecting');
    setError(null);

    const mqttClient = mqtt.connect(mqttUrl, {
      username:           mqttUsername,
      password:           mqttPassword,
      clientId:           getStableClientId(),
      protocolId:         'MQTT',
      protocolVersion:    4,
      clean:              true,
      reconnectPeriod:    3000,
      connectTimeout:     30 * 1000,
      rejectUnauthorized: false,
      // Will fires on unexpected disconnect — signals user went offline
      will: {
        topic:   `users/${username}/status`,
        payload: JSON.stringify({ online: false, user: username }),
        qos:     1,
        retain:  true,
      },
    });

    clientRef.current = mqttClient;
    setClient(mqttClient);

    return new Promise((resolve, reject) => {
      const handleConnect = () => {
        setStatus('connected');
        setError(null);
        mqttClient.subscribe('chat',           { qos: 1 });
        mqttClient.subscribe('oneToOne/#',     { qos: 1 });
        mqttClient.subscribe('users/+/status', { qos: 1 });
        // Publish retained presence so others know we're online
        mqttClient.publish(
          `users/${username}/status`,
          JSON.stringify({ online: true, user: username, ts: Date.now() }),
          { qos: 1, retain: true }
        );
        cleanup();
        resolve(mqttClient);
      };

      const handleError = (err) => {
        setStatus('error');
        setError(err);
        cleanup();
        mqttClient.end();
        reject(err);
      };

      const handleClose = () => {
        setStatus('disconnected');
      };

      const cleanup = () => {
        mqttClient.off('connect', handleConnect);
        mqttClient.off('error',   handleError);
      };

      mqttClient.on('connect', handleConnect);
      mqttClient.on('error',   handleError);
      mqttClient.on('close',   handleClose);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
    setClient(null);
    setStatus('idle');
  }, []);

  return (
    <MqttContext.Provider value={{ client, status, error, connect, disconnect }}>
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = () => {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useMqtt must be used within a MqttProvider');
  return ctx;
};
