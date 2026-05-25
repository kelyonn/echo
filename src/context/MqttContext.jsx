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
  const [client, setClient]   = useState(null);
  const [status, setStatus]   = useState('idle');
  const [error, setError]     = useState(null);
  const [catching, setCatching] = useState(false); // true during catch-up window after reconnect
  const clientRef             = useRef(null);

  const connect = useCallback((username) => {
    const mqttUrl      = (import.meta.env.VITE_MQTT_BROKER_URL || import.meta.env.VITE_MQTT_URL || '').trim();
    const mqttUsername = (import.meta.env.VITE_MQTT_USERNAME || '').trim();
    const mqttPassword = (import.meta.env.VITE_MQTT_PASSWORD || '').trim();

    if (!mqttUrl || !mqttUsername || !mqttPassword) {
      const missingError = new Error('MQTT environment variables are not set.');
      setError(missingError);
      setStatus('error');
      return Promise.reject(missingError);
    }

    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
      setClient(null);
    }

    setStatus('connecting');
    setError(null);

    // Stable clientId persists across page reloads for broker session continuity
    const clientId = getStableClientId();

    const mqttClient = mqtt.connect(mqttUrl, {
      username:        mqttUsername,
      password:        mqttPassword,
      clientId,
      protocolId:      'MQTT',
      protocolVersion: 4,
      clean:           true,           // simple session — safest option for free-tier brokers
      reconnectPeriod: 2000,
      connectTimeout:  30 * 1000,
      will: {
        topic:   'chat',
        payload: JSON.stringify({
          id:        `sys_${Date.now()}_will`,
          type:      'text',
          content:   `${username} left the chat`,
          sender:    'system',
          timestamp: new Date().toISOString(),
        }),
        qos:    0,
        retain: false,
      },
      rejectUnauthorized: false,
    });

    clientRef.current = mqttClient;
    setClient(mqttClient);

    return new Promise((resolve, reject) => {
      let reconnecting = false;

      const handleConnect = (connack) => {
        setStatus('connected');
        setError(null);

        // If sessionPresent = true the broker is resuming a session and may deliver queued messages
        if (connack?.sessionPresent && reconnecting) {
          setCatching(true);
          setTimeout(() => setCatching(false), 3000);
        }

        // Core subscriptions
        mqttClient.subscribe('chat',       { qos: 1 });
        mqttClient.subscribe('oneToOne/#', { qos: 1 });

        // Only announce on the very first connect, not every reconnect
        if (!reconnecting) {
          mqttClient.publish('chat', JSON.stringify({
            id:        `sys_${Date.now()}_join`,
            type:      'text',
            content:   `${username} joined the chat`,
            sender:    'system',
            timestamp: new Date().toISOString(),
          }), { qos: 0 });
        }
        reconnecting = true;

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
        setClient(null);
        clientRef.current = null;
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
    setCatching(false);
  }, []);

  /**
   * Publish with retain flag — used for broadcasting public keys and presence.
   */
  const publishRetained = useCallback((topic, payload) => {
    if (!clientRef.current) return;
    try {
      clientRef.current.publish(topic, payload, { qos: 1, retain: true });
    } catch {}
  }, []);

  return (
    <MqttContext.Provider value={{ client, status, error, catching, connect, disconnect, publishRetained }}>
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error('useMqtt must be used within a MqttProvider');
  }
  return context;
};
