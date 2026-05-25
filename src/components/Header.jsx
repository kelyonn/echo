import ThemeToggle from './ThemeToggle';
import { useMqtt } from '../context/MqttContext';

const Header = () => {
  const { status } = useMqtt();
  const statusLabel = {
    idle: 'Offline',
    connecting: 'Connecting',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  }[status];

  const statusClasses = {
    idle: 'bg-gray-200 text-gray-800',
    connecting: 'bg-yellow-100 text-yellow-800',
    connected: 'bg-green-100 text-green-800',
    disconnected: 'bg-orange-100 text-orange-800',
    error: 'bg-red-100 text-red-800',
  }[status];

  return (
    <header className="w-full flex items-center justify-between gap-4 p-4 glass-surface">
      <div>
        <div className="text-sm tracking-wider text-gray-500">PESCONNECT</div>
        <div className="text-lg font-semibold text-gray-800">Liquid Chat</div>
      </div>

      <div className="text-center">
        <div className="text-xs text-gray-500">Connection</div>
        <div className={`inline-block px-3 py-1 rounded-full text-sm mt-1 ${statusClasses}`}>{statusLabel}</div>
      </div>

      <div className="text-right">
        <div className="text-xs text-gray-500">Appearance</div>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
