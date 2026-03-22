import React from 'react';
import Icon from '../../Icon';

export default function Header({
  isOnline,
  offlineCount
}) {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="header-right" style={{ marginLeft: 'auto' }}>
          <div className="status-indicators">
            {!isOnline && (
              <div className="offline-indicator" title="You are offline">
                <Icon name="wifi-off" size={18} />
                <span>Offline</span>
                {offlineCount > 0 && (
                  <span className="offline-count">{offlineCount}</span>
                )}
              </div>
            )}
            {isOnline && (
              <div className="online-indicator" title="Connected">
                <Icon name="wifi" size={18} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
