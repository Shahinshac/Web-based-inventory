/**
 * @file AdminTickets.jsx
 * @description Professional support ticket management dashboard for admins
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchAllTickets, updateTicketStatus, addTicketMessage, updateTicketPriority } from '../../services/ticketService';
import { formatTimestampIST } from '../../utils/dateFormatter';

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await fetchAllTickets(filter);
      setTickets(data);
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      await loadTickets();
      if (selectedTicket?._id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handlePriorityChange = async (ticketId, newPriority) => {
    try {
      await updateTicketPriority(ticketId, newPriority);
      await loadTickets();
      if (selectedTicket?._id === ticketId) {
        setSelectedTicket({ ...selectedTicket, priority: newPriority });
      }
    } catch (err) {
      alert('Failed to update priority');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    try {
      setSubmitting(true);
      await addTicketMessage(selectedTicket._id, replyMessage);
      const data = await fetchAllTickets(filter);
      setTickets(data);
      const updated = data.find(t => t._id === selectedTicket._id);
      setSelectedTicket(updated);
      setReplyMessage('');
    } catch (err) {
      alert('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    const colors = {
      open: { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' },
      in_progress: { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe' },
      resolved: { bg: '#f0fdf4', text: '#16a34a', border: '#dcfce7' },
      closed: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }
    };
    const style = colors[s] || colors.open;
    return (
      <span style={{
        padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
        textTransform: 'uppercase', background: style.bg, color: style.text, border: `1px solid ${style.border}`
      }}>
        {s.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="admin-tickets-container">
      <div className="tickets-header">
        <div className="header-left">
          <h1>Support Desk</h1>
          <p>Manage and respond to customer queries</p>
        </div>
        <div className="header-filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Tickets</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button className="refresh-btn" onClick={loadTickets}>
            <Icon name="refresh-cw" size={16} />
          </button>
        </div>
      </div>

      <div className="tickets-layout">
        {/* Ticket Grid/List */}
        <div className="tickets-list-pane">
          {loading ? (
            <div className="pane-loader">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="pane-empty">No tickets found</div>
          ) : (
            <div className="tickets-grid">
              {tickets.map(t => (
                <div 
                  key={t._id} 
                  className={`ticket-card ${selectedTicket?._id === t._id ? 'selected' : ''}`}
                  onClick={() => setSelectedTicket(t)}
                >
                  <div className="card-top">
                    <span className="tkt-id">{t.ticketId}</span>
                    <span className="tkt-cat">{t.category}</span>
                  </div>
                  <h3 className="tkt-subject">{t.subject}</h3>
                  <p className="tkt-customer">By: {t.customerName}</p>
                  <div className="card-bottom">
                    {getStatusBadge(t.status)}
                    <span className="tkt-time">{formatTimestampIST(t.updatedAt).split(',')[0]}</span>
                  </div>
                  {t.priority === 'Critical' && <div className="critical-ribbon">CRITICAL</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Pane */}
        <div className="conversation-pane">
          {selectedTicket ? (
            <div className="convo-content">
              <div className="convo-header">
                <div className="tkt-info">
                  <h2>{selectedTicket.subject}</h2>
                  <div className="tkt-meta-strip">
                    <span>Customer: <strong>{selectedTicket.customerName}</strong></span>
                    <span className="separator">|</span>
                    <span>Status: </span>
                    <select 
                      value={selectedTicket.status} 
                      onChange={(e) => handleStatusChange(selectedTicket._id, e.target.value)}
                      className="status-select-inline"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <span className="separator">|</span>
                    <span>Priority: </span>
                    <select 
                      value={selectedTicket.priority} 
                      onChange={(e) => handlePriorityChange(selectedTicket._id, e.target.value)}
                      className="prio-select-inline"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="convo-messages">
                {selectedTicket.updates.map((msg, idx) => (
                  <div key={idx} className={`admin-msg-bubble ${msg.sender === 'customer' ? 'incoming' : 'outgoing'}`}>
                    <div className="msg-meta">
                      <span className="sender">{msg.senderName}</span>
                      <span className="time">{formatTimestampIST(msg.timestamp)}</span>
                    </div>
                    <div className="msg-body">{msg.message}</div>
                  </div>
                ))}
              </div>

              <form className="admin-reply-area" onSubmit={handleSendReply}>
                <textarea 
                  placeholder="Type your response to the customer..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                />
                <div className="reply-actions">
                  <p className="hint">Press Shift+Enter for new line</p>
                  <button type="submit" disabled={submitting || !replyMessage.trim()} className="admin-send-btn">
                    {submitting ? 'Sending...' : 'Send Response'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="convo-placeholder">
              <Icon name="inbox" size={80} />
              <h3>Select a ticket to manage</h3>
              <p>Resolve customer issues and manage support workflow</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-tickets-container { height: 100%; display: flex; flex-direction: column; padding: 1.5rem; background: #f8fafc; }
        
        .tickets-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .tickets-header h1 { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .tickets-header p { color: #64748b; font-size: 0.95rem; }
        
        .header-filters { display: flex; gap: 0.75rem; }
        .header-filters select { padding: 0.6rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; background: white; font-weight: 600; color: #334155; }
        .refresh-btn { width: 40px; height: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.2s; }
        .refresh-btn:hover { background: #f1f5f9; color: #0f172a; }

        .tickets-layout { display: grid; grid-template-columns: 400px 1fr; gap: 1.5rem; flex: 1; min-height: 0; }
        
        .tickets-list-pane { background: white; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
        .tickets-grid { overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        
        .ticket-card {
          padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer;
          transition: all 0.2s; position: relative; overflow: hidden;
        }
        .ticket-card:hover { border-color: #cbd5e1; background: #f8fafc; }
        .ticket-card.selected { border-color: #6366f1; background: #f5f3ff; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1); }
        
        .card-top { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .tkt-id { font-weight: 800; color: #6366f1; font-size: 0.75rem; }
        .tkt-cat { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .tkt-subject { font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; }
        .tkt-customer { font-size: 0.85rem; color: #64748b; margin-bottom: 1rem; }
        .card-bottom { display: flex; justify-content: space-between; align-items: center; }
        .tkt-time { font-size: 0.75rem; color: #94a3b8; }
        
        .critical-ribbon {
          position: absolute; top: 12px; right: -25px; transform: rotate(45deg);
          background: #ef4444; color: white; font-size: 8px; font-weight: 900;
          padding: 2px 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .conversation-pane { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
        .convo-content { height: 100%; display: flex; flex-direction: column; }
        .convo-header { padding: 1.5rem 2rem; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .convo-header h2 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem; }
        .tkt-meta-strip { display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: #64748b; }
        .separator { color: #e2e8f0; }
        
        .status-select-inline, .prio-select-inline {
          padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 700; outline: none;
        }
        .status-select-inline { color: #2563eb; }
        .prio-select-inline { color: #f59e0b; }

        .convo-messages { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; background: #fdfdfd; }
        .admin-msg-bubble { max-width: 85%; padding: 1.25rem; border-radius: 12px; position: relative; }
        .admin-msg-bubble.incoming { align-self: flex-start; background: #f1f5f9; color: #334155; border-bottom-left-radius: 0; }
        .admin-msg-bubble.outgoing { align-self: flex-end; background: #6366f1; color: white; border-bottom-right-radius: 0; }
        
        .msg-meta { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.75rem; font-weight: 700; opacity: 0.8; }
        .msg-body { font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; }

        .admin-reply-area { padding: 1.5rem 2rem; border-top: 1px solid #e2e8f0; background: white; }
        .admin-reply-area textarea {
          width: 100%; height: 100px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem;
          font-size: 0.95rem; resize: none; margin-bottom: 1rem; outline: none; transition: border-color 0.2s;
        }
        .admin-reply-area textarea:focus { border-color: #6366f1; }
        
        .reply-actions { display: flex; justify-content: space-between; align-items: center; }
        .hint { font-size: 0.75rem; color: #94a3b8; }
        .admin-send-btn { background: #6366f1; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .admin-send-btn:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2); }
        
        .convo-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #94a3b8; }
        .convo-placeholder h3 { color: #64748b; margin: 1.5rem 0 0.5rem; }
      `}</style>
    </div>
  );
};

export default AdminTickets;
