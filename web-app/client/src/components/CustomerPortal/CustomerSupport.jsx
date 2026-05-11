/**
 * @file CustomerSupport.jsx
 * @description Ultra-Premium Zoho-style support ticketing system for customer portal
 */

import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../Icon';
import { fetchCustomerTickets, createTicket, addTicketMessage } from '../../services/ticketService';
import { formatTimestampIST } from '../../utils/dateFormatter';

const CustomerSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const [newTicketData, setNewTicketData] = useState({
    subject: '',
    category: 'Product Issue',
    priority: 'Medium',
    description: ''
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.updates]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await fetchCustomerTickets();
      setTickets(data);
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      setSending(true);
      await createTicket(newTicketData);
      setShowNewTicketModal(false);
      setNewTicketData({ subject: '', category: 'Product Issue', priority: 'Medium', description: '' });
      await loadTickets();
    } catch (err) {
      setError('Failed to create ticket');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      await addTicketMessage(selectedTicket._id, newMessage);
      const updatedTickets = await fetchCustomerTickets();
      setTickets(updatedTickets);
      const updated = updatedTickets.find(t => t._id === selectedTicket._id);
      setSelectedTicket(updated);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'closed') return <span className="badge badge-success">Closed</span>;
    if (s === 'in_progress') return <span className="badge badge-info">In Progress</span>;
    if (s === 'resolved') return <span className="badge badge-success">Resolved</span>;
    return <span className="badge badge-warning">Open</span>;
  };

  const getPriorityColor = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'critical') return '#ef4444';
    if (p === 'high') return '#f59e0b';
    return '#10b981';
  };

  if (loading && tickets.length === 0) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div className="customer-support-view">
      <div className="support-layout">
        {/* Tickets Sidebar */}
        <aside className="support-sidebar portal-card">
          <div className="sidebar-header">
            <h3>Support Tickets</h3>
            <button className="new-tkt-btn" onClick={() => setShowNewTicketModal(true)}>
              <Icon name="plus" size={16} />
              <span>New Ticket</span>
            </button>
          </div>
          
          <div className="ticket-list">
            {tickets.length === 0 ? (
              <div className="empty-mini">No tickets yet</div>
            ) : (
              tickets.map(t => (
                <div 
                  key={t._id} 
                  className={`ticket-item ${selectedTicket?._id === t._id ? 'active' : ''}`}
                  onClick={() => setSelectedTicket(t)}
                >
                  <div className="tkt-meta">
                    <span className="tkt-id">{t.ticketId}</span>
                    <span className="tkt-date">{formatTimestampIST(t.createdAt).split(',')[0]}</span>
                  </div>
                  <div className="tkt-subject">{t.subject}</div>
                  <div className="tkt-footer">
                    {getStatusBadge(t.status)}
                    <div className="prio-dot" style={{ background: getPriorityColor(t.priority) }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Conversation Area */}
        <main className="support-main portal-card">
          {selectedTicket ? (
            <div className="conversation-container">
              <div className="conversation-header">
                <div className="header-info">
                  <div className="header-top">
                    <span className="tkt-id-large">{selectedTicket.ticketId}</span>
                    <h2>{selectedTicket.subject}</h2>
                  </div>
                  <div className="header-meta">
                    <span className="cat-tag">{selectedTicket.category}</span>
                    <span className="prio-tag" style={{ color: getPriorityColor(selectedTicket.priority) }}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                </div>
                {getStatusBadge(selectedTicket.status)}
              </div>

              <div className="messages-area">
                {selectedTicket.updates.map((msg, idx) => (
                  <div key={idx} className={`message-bubble ${msg.sender === 'customer' ? 'sent' : 'received'}`}>
                    <div className="msg-header">
                      <span className="sender">{msg.sender === 'customer' ? 'You' : 'Support Team'}</span>
                      <span className="time">{formatTimestampIST(msg.timestamp)}</span>
                    </div>
                    <div className="msg-text">{msg.message}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {selectedTicket.status !== 'closed' && (
                <form className="message-input-area" onSubmit={handleSendMessage}>
                  <textarea 
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button type="submit" className="send-btn" disabled={sending || !newMessage.trim()}>
                    {sending ? <div className="spinner-mini"></div> : <Icon name="send" size={20} />}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="no-selection">
              <div className="selection-icon">
                <Icon name="message-square" size={60} />
              </div>
              <h3>Select a ticket to view conversation</h3>
              <p>Or create a new one to get help from our technical team.</p>
            </div>
          )}
        </main>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal glass-modal">
            <div className="modal-header">
              <h2>Open New Support Ticket</h2>
              <button className="close-modal" onClick={() => setShowNewTicketModal(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="new-tkt-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    placeholder="Short summary of issue"
                    value={newTicketData.subject}
                    onChange={(e) => setNewTicketData({...newTicketData, subject: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-row split">
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    value={newTicketData.category}
                    onChange={(e) => setNewTicketData({...newTicketData, category: e.target.value})}
                  >
                    <option>Product Issue</option>
                    <option>Warranty Claim</option>
                    <option>EMI Query</option>
                    <option>Billing</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    value={newTicketData.priority}
                    onChange={(e) => setNewTicketData({...newTicketData, priority: e.target.value})}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Detailed Description</label>
                <textarea 
                  placeholder="Tell us more about the problem..."
                  value={newTicketData.description}
                  onChange={(e) => setNewTicketData({...newTicketData, description: e.target.value})}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-primary" disabled={sending}>
                  {sending ? 'Creating...' : 'Submit Ticket'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowNewTicketModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .customer-support-view { height: calc(100vh - 160px); animation: fadeIn 0.4s ease-out; }
        .support-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; height: 100%; }
        
        .support-sidebar { padding: 1.5rem 0; display: flex; flex-direction: column; overflow: hidden; }
        .sidebar-header { padding: 0 1.5rem 1.5rem; border-bottom: 1px solid var(--portal-border); }
        .sidebar-header h3 { font-size: 1.1rem; font-weight: 800; color: white; margin-bottom: 1rem; }
        
        .new-tkt-btn {
          width: 100%; background: var(--portal-accent); color: white; border: none; padding: 0.75rem;
          border-radius: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          gap: 0.5rem; cursor: pointer; transition: all 0.3s;
        }
        .new-tkt-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px var(--portal-accent-glow); }
        
        .ticket-list { flex: 1; overflow-y: auto; padding: 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .ticket-item {
          padding: 1rem; border-radius: 14px; background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--portal-border); cursor: pointer; transition: all 0.2s;
        }
        .ticket-item:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.2); }
        .ticket-item.active { background: rgba(99, 102, 241, 0.1); border-color: var(--portal-accent); }
        
        .tkt-meta { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .tkt-id { font-size: 0.7rem; font-weight: 800; color: var(--portal-accent); }
        .tkt-date { font-size: 0.7rem; color: var(--portal-text-dim); }
        .tkt-subject { font-size: 0.9rem; font-weight: 700; color: white; margin-bottom: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .tkt-footer { display: flex; justify-content: space-between; align-items: center; }
        .prio-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 5px currentColor; }
        
        .support-main { padding: 0; display: flex; flex-direction: column; overflow: hidden; position: relative; }
        .no-selection { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--portal-text-dim); }
        .selection-icon { opacity: 0.2; margin-bottom: 1.5rem; }
        
        .conversation-container { height: 100%; display: flex; flex-direction: column; }
        .conversation-header {
          padding: 1.5rem 2rem; border-bottom: 1px solid var(--portal-border);
          display: flex; justify-content: space-between; align-items: flex-start;
          background: rgba(255, 255, 255, 0.02);
        }
        .header-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
        .tkt-id-large { font-size: 0.8rem; font-weight: 900; color: var(--portal-accent); background: rgba(99, 102, 241, 0.1); padding: 0.2rem 0.5rem; border-radius: 4px; }
        .conversation-header h2 { font-size: 1.25rem; font-weight: 800; color: white; }
        .header-meta { display: flex; gap: 1rem; font-size: 0.8rem; font-weight: 600; }
        .cat-tag { color: var(--portal-text-dim); }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
        .message-bubble { max-width: 80%; padding: 1.2rem; border-radius: 18px; line-height: 1.6; position: relative; }
        .message-bubble.sent { align-self: flex-end; background: var(--portal-accent); color: white; border-bottom-right-radius: 4px; }
        .message-bubble.received { align-self: flex-start; background: var(--portal-glass); border: 1px solid var(--portal-border); color: var(--portal-text); border-bottom-left-radius: 4px; }
        
        .msg-header { display: flex; justify-content: space-between; gap: 2rem; margin-bottom: 0.5rem; font-size: 0.75rem; font-weight: 700; opacity: 0.8; }
        .msg-text { font-size: 0.95rem; white-space: pre-wrap; }
        
        .message-input-area {
          padding: 1.5rem 2rem; background: rgba(0,0,0,0.2); border-top: 1px solid var(--portal-border);
          display: flex; gap: 1rem; align-items: flex-end;
        }
        .message-input-area textarea {
          flex: 1; background: var(--portal-glass); border: 1px solid var(--portal-border); border-radius: 12px;
          color: white; padding: 1rem; font-size: 0.95rem; resize: none; height: 80px; transition: all 0.3s;
        }
        .message-input-area textarea:focus { border-color: var(--portal-accent); outline: none; background: rgba(255,255,255,0.08); }
        
        .send-btn {
          width: 50px; height: 50px; background: var(--portal-accent); color: white; border: none;
          border-radius: 12px; cursor: pointer; transition: all 0.3s; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 0 15px var(--portal-accent-glow); }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .portal-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000;
        }
        .glass-modal { width: 100%; max-width: 600px; padding: 2.5rem; position: relative; border-top: 4px solid var(--portal-accent); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .modal-header h2 { font-size: 1.5rem; font-weight: 800; color: white; }
        .close-modal { background: transparent; border: none; color: var(--portal-text-dim); cursor: pointer; }
        
        .new-tkt-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
        .form-group label { font-size: 0.8rem; font-weight: 700; color: var(--portal-text-dim); text-transform: uppercase; }
        .form-group input, .form-group select, .form-group textarea {
          background: rgba(255,255,255,0.05); border: 1px solid var(--portal-border);
          border-radius: 10px; color: white; padding: 0.8rem 1rem; font-size: 1rem; outline: none; transition: all 0.3s;
        }
        .form-group textarea { height: 120px; resize: none; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--portal-accent); background: rgba(255,255,255,0.08); }
        
        .form-row.split { display: flex; gap: 1rem; }
        .modal-footer { display: flex; gap: 1rem; margin-top: 1rem; }
        .modal-footer button { flex: 1; }

        @media (max-width: 900px) {
          .support-layout { grid-template-columns: 1fr; }
          .support-sidebar { display: ${selectedTicket ? 'none' : 'flex'}; }
          .support-main { display: ${selectedTicket ? 'flex' : 'none'}; }
        }
      `}</style>
    </div>
  );
};

export default CustomerSupport;
