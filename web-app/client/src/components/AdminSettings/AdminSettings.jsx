import React, { useState } from 'react';
import Icon from '../../Icon';
import Modal from '../Common/Modal';
import { getAuthHeaders } from '../../utils/api';

const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return baseUrl.replace(/\/$/, '');
};

export default function AdminSettings() {
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState(null);
  const [wipeError, setWipeError] = useState('');

  const CONFIRMATION_PHRASE = 'DELETE ALL DATA';

  const handleWipeData = async () => {
    if (confirmationPhrase !== CONFIRMATION_PHRASE) {
      setWipeError('Confirmation phrase does not match. Please try again.');
      return;
    }

    setIsWiping(true);
    setWipeError('');
    setWipeResult(null);

    try {
      const response = await fetch(
        `${getApiUrl()}/api/admin/wipe-data`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to wipe data');
      }

      setWipeResult(data);
      setConfirmationPhrase('');

      // Show success for 3 seconds then close
      setTimeout(() => {
        setWipeDialogOpen(false);
        setWipeResult(null);
      }, 3000);
    } catch (error) {
      setWipeError(error.message || 'An error occurred while wiping data');
    } finally {
      setIsWiping(false);
    }
  };

  const handleCancel = () => {
    setConfirmationPhrase('');
    setWipeError('');
    setWipeResult(null);
    setWipeDialogOpen(false);
  };

  return (
    <div className="admin-settings-container">
      <div className="settings-header">
        <h1>
          <Icon name="settings" size={24} />
          Admin Settings
        </h1>
      </div>

      <div className="settings-sections">
        {/* Danger Zone */}
        <div className="settings-section danger-zone">
          <div className="section-header">
            <Icon name="alert-triangle" size={20} style={{ color: '#ef4444' }} />
            <h2>Danger Zone</h2>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Wipe All Data</h3>
              <p className="setting-description">
                Permanently delete all business data (invoices, customers, products, expenses, etc.).
                This action cannot be undone. Admin users will be preserved.
              </p>
              <div className="risk-badge">⚠️ CRITICAL - Cannot be undone</div>
            </div>
            <button
              className="btn-danger"
              onClick={() => setWipeDialogOpen(true)}
            >
              <Icon name="trash-2" size={16} />
              Wipe Data
            </button>
          </div>
        </div>
      </div>

      {/* Wipe Data Confirmation Dialog */}
      <Modal
        isOpen={wipeDialogOpen}
        onClose={handleCancel}
        title="⚠️ Confirm Data Wipe"
        size="sm"
      >
        <div className="wipe-dialog-content">
          {wipeResult ? (
            // Success state
            <div className="wipe-success">
              <div className="success-icon">✓</div>
              <h3>Data Wipe Complete!</h3>
              <p className="success-message">All business data has been deleted.</p>
              <div className="wipe-stats">
                <div className="stat">
                  <span className="stat-label">Records Deleted:</span>
                  <span className="stat-value">{wipeResult.stats.total_records_deleted}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Collections Wiped:</span>
                  <span className="stat-value">{wipeResult.stats.collections_wiped}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Admin Users Preserved:</span>
                  <span className="stat-value">{wipeResult.stats.admin_users_preserved}</span>
                </div>
              </div>
            </div>
          ) : (
            // Confirmation state
            <>
              <div className="warning-box">
                <Icon name="alert-circle" size={20} style={{ color: '#ef4444' }} />
                <p>
                  <strong>WARNING:</strong> This will permanently delete ALL business data including:
                </p>
                <ul className="warning-list">
                  <li>✗ Customers & Contact Information</li>
                  <li>✗ Products & Inventory</li>
                  <li>✗ Invoices & Billing Records</li>
                  <li>✗ Expenses & Financial Records</li>
                  <li>✗ Warranties & EMI Plans</li>
                  <li>✓ Admin Users (Preserved)</li>
                </ul>
              </div>

              {wipeError && (
                <div className="error-box">
                  <Icon name="alert-circle" size={16} style={{ color: '#dc2626' }} />
                  <span>{wipeError}</span>
                </div>
              )}

              <div className="confirmation-section">
                <label>
                  To confirm, type this phrase:
                  <strong style={{ display: 'block', marginTop: '8px', color: '#dc2626' }}>
                    {CONFIRMATION_PHRASE}
                  </strong>
                </label>
                <input
                  type="text"
                  placeholder="Type the phrase above..."
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  disabled={isWiping}
                  className="confirmation-input"
                  autoFocus
                />
              </div>

              <div className="dialog-actions">
                <button
                  className="btn-cancel"
                  onClick={handleCancel}
                  disabled={isWiping}
                >
                  Cancel
                </button>
                <button
                  className="btn-wipe"
                  onClick={handleWipeData}
                  disabled={isWiping || confirmationPhrase !== CONFIRMATION_PHRASE}
                >
                  {isWiping ? (
                    <>
                      <Icon name="loader" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Wiping Data...
                    </>
                  ) : (
                    <>
                      <Icon name="trash-2" size={16} />
                      Yes, Delete Everything
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          .wipe-dialog-content {
            padding: 20px 0;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .warning-box {
            background: #fff5f5;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            display: flex;
            gap: 12px;
          }

          .warning-box p {
            margin: 0 0 12px 0;
            color: #dc2626;
            font-weight: 600;
          }

          .warning-list {
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 13px;
            color: #991b1b;
          }

          .warning-list li {
            padding: 4px 0;
          }

          .error-box {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #dc2626;
            font-size: 13px;
          }

          .confirmation-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .confirmation-section label {
            font-size: 13px;
            color: #374151;
            font-weight: 500;
          }

          .confirmation-input {
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-family: monospace;
            font-size: 14px;
            transition: all 0.2s;
          }

          .confirmation-input:focus {
            outline: none;
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
          }

          .confirmation-input:disabled {
            background: #f3f4f6;
            cursor: not-allowed;
          }

          .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 8px;
          }

          .btn-cancel,
          .btn-wipe {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
          }

          .btn-cancel {
            background: #e5e7eb;
            color: #374151;
          }

          .btn-cancel:hover:not(:disabled) {
            background: #d1d5db;
          }

          .btn-cancel:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-wipe {
            background: #ef4444;
            color: white;
          }

          .btn-wipe:hover:not(:disabled) {
            background: #dc2626;
          }

          .btn-wipe:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .wipe-success {
            text-align: center;
            padding: 20px 0;
          }

          .success-icon {
            font-size: 48px;
            margin-bottom: 16px;
            animation: scaleIn 0.3s ease-in;
          }

          .wipe-success h3 {
            color: #22c55e;
            margin: 0 0 8px 0;
            font-size: 18px;
          }

          .success-message {
            color: #6b7280;
            margin-bottom: 16px;
            font-size: 14px;
          }

          .wipe-stats {
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: #f9fafb;
            border-radius: 8px;
            padding: 12px;
          }

          .stat {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            font-size: 13px;
          }

          .stat-label {
            color: #6b7280;
            font-weight: 500;
          }

          .stat-value {
            color: #1f2937;
            font-weight: 700;
            font-size: 16px;
          }

          @keyframes scaleIn {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Modal>

      <style jsx>{`
        .admin-settings-container {
          padding: 24px;
          background: white;
          border-radius: 12px;
          margin: 20px;
        }

        .settings-header {
          margin-bottom: 24px;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 16px;
        }

        .settings-header h1 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          color: #1f2937;
          font-size: 24px;
        }

        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-section {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          background: #fafafa;
        }

        .settings-section.danger-zone {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
        }

        .section-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 18px;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          padding: 16px 0;
        }

        .setting-info {
          flex: 1;
        }

        .setting-info h3 {
          margin: 0 0 8px 0;
          color: #111827;
          font-size: 16px;
        }

        .setting-description {
          margin: 0 0 12px 0;
          color: #6b7280;
          font-size: 13px;
          line-height: 1.5;
        }

        .risk-badge {
          display: inline-block;
          background: #fef2f2;
          color: #dc2626;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
        }

        .btn-danger {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-danger:hover {
          background: #dc2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .btn-danger:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
