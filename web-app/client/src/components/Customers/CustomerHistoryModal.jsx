import React, { useState } from 'react';
import Modal from '../Common/Modal';
import Icon from '../../Icon';
import Spinner from '../Common/Spinner';

export default function CustomerHistoryModal({ 
  isOpen, 
  onClose, 
  customer, 
  data, 
  isLoading 
}) {
  const [activeTab, setActiveTab] = useState('purchases');

  if (!isOpen) return null;

  const { bills = [], warranties = [], stats = {} } = data || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📜 History: ${customer?.name || 'Customer'}`}
      size="xl"
    >
      <div className="customer-history-content">
        {isLoading ? (
          <div className="loading-state">
            <Spinner size="large" />
            <p>Fetching purchase history...</p>
          </div>
        ) : (
          <>
            {/* Quick Stats Summary */}
            <div className="history-stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">
                  <Icon name="rupee" size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Spent</span>
                  <span className="stat-value">₹{(stats.totalSpent || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">
                  <Icon name="shopping-cart" size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Purchase Count</span>
                  <span className="stat-value">{stats.purchaseCount || 0}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">
                  <Icon name="shield" size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Active Warranties</span>
                  <span className="stat-value">{stats.activeWarranties || 0}</span>
                </div>
              </div>
            </div>

            {/* Tabs for Purchases and Warranties */}
            <div className="modal-tabs">
              <button 
                className={`modal-tab ${activeTab === 'purchases' ? 'active' : ''}`}
                onClick={() => setActiveTab('purchases')}
              >
                <Icon name="file-text" size={16} />
                Purchases
              </button>
              <button 
                className={`modal-tab ${activeTab === 'warranties' ? 'active' : ''}`}
                onClick={() => setActiveTab('warranties')}
              >
                <Icon name="shield-check" size={16} />
                Warranties
              </button>
            </div>

            <div className="tab-contents">
              {activeTab === 'purchases' && (
                <div className="history-table-container">
                  {bills.length > 0 ? (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Invoice No.</th>
                          <th>Total Amount</th>
                          <th>Method</th>
                          <th>Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map(bill => (
                          <tr key={bill.id}>
                            <td>{new Date(bill.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td><span className="bill-badge">{bill.billNumber}</span></td>
                            <td>₹{bill.total.toFixed(2)}</td>
                            <td><span className="method-badge">{bill.paymentMode}</span></td>
                            <td>{bill.items?.length || 0} items</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-history">
                      <Icon name="inbox" size={48} color="#cbd5e1" />
                      <p>No purchase records found for this customer.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'warranties' && (
                <div className="history-table-container">
                  {warranties.length > 0 ? (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Serial/SKU</th>
                          <th>Start Date</th>
                          <th>Expiry Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warranties.map(w => (
                          <tr key={w.id}>
                            <td>{w.productName}</td>
                            <td>{w.productSku || 'N/A'}</td>
                            <td>{new Date(w.startDate).toLocaleDateString('en-IN')}</td>
                            <td>{new Date(w.expiryDate).toLocaleDateString('en-IN')}</td>
                            <td>
                              <span className={`status-pill ${w.status}`}>
                                {w.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-history">
                      <Icon name="shield-off" size={48} color="#cbd5e1" />
                      <p>No warranty records found for this customer.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx="true">{`
        .customer-history-content {
          min-height: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 16px;
          color: #64748b;
        }

        .history-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.purple { background: #f5f3ff; color: #7c3aed; }
        .stat-icon.blue { background: #eff6ff; color: #3b82f6; }
        .stat-icon.green { background: #f0fdf4; color: #10b981; }

        .stat-label { font-size: 12px; color: #64748b; display: block; }
        .stat-value { font-size: 16px; font-weight: 700; color: #0f172a; }

        .modal-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #f1f5f9;
        }

        .modal-tab {
          padding: 12px 20px;
          border: none;
          background: none;
          color: #64748b;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }

        .modal-tab:hover { color: #0f172a; }
        .modal-tab.active {
          color: #4f46e5;
          border-bottom-color: #4f46e5;
        }

        .history-table-container {
          flex: 1;
          overflow-y: auto;
          max-height: 450px;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .history-table th {
          position: sticky;
          top: 0;
          background: #f8fafc;
          text-align: left;
          padding: 12px;
          color: #64748b;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }

        .history-table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }

        .bill-badge {
          font-family: monospace;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          color: #475569;
          font-weight: 600;
        }

        .method-badge {
          background: #e0f2fe;
          color: #0369a1;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-pill {
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-pill.active { background: #dcfce7; color: #166534; }
        .status-pill.expired { background: #fee2e2; color: #991b1b; }

        .empty-history {
          padding: 60px 0;
          text-align: center;
          color: #94a3b8;
        }
      `}</style>
    </Modal>
  );
}
