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

  if (loading && tickets.length === 0) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div className={`customer-support-view ${selectedTicket ? 'ticket-active' : ''}`}>
      <div className={`support-layout ${selectedTicket ? 'mobile-show-ticket' : 'mobile-show-list'}`}>
        <aside className="support-sidebar portal-card">
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Tickets</h3>
            <button className="logout-btn" style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.4rem 0.8rem' }} onClick={() => setShowNewTicketModal(true)}>
              <Icon name="plus" size={14} /> New
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>No tickets found</div>
            ) : (
              tickets.map(t => (
                <div 
                  key={t._id} 
                  className={`ticket-item-clean ${selectedTicket?._id === t._id ? 'active' : ''}`}
                  onClick={() => setSelectedTicket(t)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: selectedTicket?._id === t._id ? '#f1f5f9' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1' }}>{t.ticketId}</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{formatTimestampIST(t.createdAt).split(',')[0]}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                  {getStatusBadge(t.status)}
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="support-main portal-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedTicket ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <button 
                  className="mobile-back-btn"
                  onClick={() => setSelectedTicket(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                    padding: 0
                  }}
                >
                  <Icon name="arrow-left" size={16} /> Back to All Tickets
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{selectedTicket.subject}</h2>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      <span>{selectedTicket.category}</span>
                      <span style={{ color: selectedTicket.priority === 'Critical' ? '#ef4444' : '#6366f1' }}>{selectedTicket.priority} Priority</span>
                    </div>
                  </div>
                  {getStatusBadge(selectedTicket.status)}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#ffffff' }}>
                {selectedTicket.updates.map((msg, idx) => (
                  <div key={idx} style={{ 
                    alignSelf: msg.senderRole === 'customer' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.senderRole === 'customer' ? '#6366f1' : '#f1f5f9',
                    color: msg.senderRole === 'customer' ? 'white' : '#1e293b',
                    padding: '1rem',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, marginBottom: '0.25rem' }}>
                      {msg.senderName} ({msg.senderRole})
                    </div>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{msg.message}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, textAlign: 'right', marginTop: '0.5rem' }}>
                      {formatTimestampIST(msg.timestamp)}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', background: '#ffffff' }}>
                <input 
                  type="text" 
                  placeholder="Type your reply here..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  disabled={sending || selectedTicket.status === 'closed'}
                />
                <button 
                  type="submit" 
                  className="logout-btn" 
                  style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0 1.25rem' }}
                  disabled={sending || !newMessage.trim() || selectedTicket.status === 'closed'}
                >
                  <Icon name="send" size={16} /> Send
                </button>
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', flexDirection: 'column', gap: '1rem' }}>
              <Icon name="message-square" size={48} style={{ opacity: 0.3 }} />
              <p>Select a ticket from the left panel to view conversation</p>
            </div>
          )}
        </main>
      </div>

      {showNewTicketModal && (
        <div className="portal-modal-overlay" onClick={() => setShowNewTicketModal(false)}>
          <div className="portal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <h3>Create Support Ticket</h3>
              <button className="close-btn" onClick={() => setShowNewTicketModal(false)}><Icon name="x" size={20} /></button>
            </div>
            <form onSubmit={handleCreateTicket} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Subject</label>
                <input 
                  type="text" 
                  value={newTicketData.subject} 
                  onChange={(e) => setNewTicketData({...newTicketData, subject: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Category</label>
                  <select 
                    value={newTicketData.category} 
                    onChange={(e) => setNewTicketData({...newTicketData, category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                  >
                    <option>Product Issue</option>
                    <option>Billing / Payment</option>
                    <option>Warranty Claim</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Priority</label>
                  <select 
                    value={newTicketData.priority} 
                    onChange={(e) => setNewTicketData({...newTicketData, priority: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Description</label>
                <textarea 
                  value={newTicketData.description} 
                  onChange={(e) => setNewTicketData({...newTicketData, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', height: '100px', resize: 'none' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="logout-btn" style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', minHeight: '44px' }} disabled={sending}>
                  {sending ? 'Submitting...' : 'Create Ticket'}
                </button>
                <button type="button" className="logout-btn" style={{ flex: 1, minHeight: '44px' }} onClick={() => setShowNewTicketModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSupport;
