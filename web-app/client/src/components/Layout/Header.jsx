import React from 'react';
import Icon from '../../Icon';

export default function Header({
  isOnline,
  connectionStatus,
  testConnection,
  offlineCount
}) {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="header-right" style={{ marginLeft: 'auto' }}>
          <div className="status-indicators">
            {connectionStatus !== 'online' && (
              <div className={`offline-indicator ${connectionStatus}`} title="Click to retry connection" onClick={testConnection}>
                <Icon name={connectionStatus === 'waking' ? 'loader' : 'wifi-off'} size={18} />
                <span>{connectionStatus === 'waking' ? 'Back-end Waking up...' : 'Offline'}</span>
                {offlineCount > 0 && (
                  <span className="offline-count">{offlineCount}</span>
                )}
                <Icon name="refresh-cw" size={12} className="retry-small" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
