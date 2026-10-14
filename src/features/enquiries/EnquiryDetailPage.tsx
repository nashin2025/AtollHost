import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingState, EmptyState } from '../../components/ui/States';
import { listConversations, listConversationMessages, type Conversation, type ConversationMessage, type Enquiry, startConversation, sendMessage, takeoverConversation, markEnquiryRead } from '../../lib/enquiries';
import { supabase } from '../../lib/supabase';
import { useParams } from 'react-router-dom';

const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  new: 'info',
  open: 'info',
  waiting: 'warning',
  contacted: 'info',
  won: 'success',
  lost: 'danger',
  closed: 'info',
};

interface Props {
  enquiryId: string;
}

export function EnquiryDetailPage({ enquiryId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyConversationId, setReplyConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const hasAuth = supabase !== null;

  const reloadEnquiry = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const { data } = await supabase
        .from('enquiries')
        .select('*')
        .eq('id', enquiryId)
        .single();
      setEnquiry(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [enquiryId]);

  const loadConversations = useCallback(async () => {
    if (!supabase || !enquiry) return;
    try {
      const convs = await listConversations(supabase, enquiry.property_id);
      const filtered = convs.filter(c => c.enquiry_id === enquiryId);
      setConversations(filtered);
      if (filtered.length > 0 && !selectedConversation) {
        setSelectedConversation(filtered[0]);
      }
    } catch {
      setConversations([]);
    }
  }, [enquiry, selectedConversation]);

  const loadMessages = useCallback(async () => {
    if (!supabase || !selectedConversation) {
      setMessages([]);
      return;
    }
    try {
      const msgs = await listConversationMessages(supabase, selectedConversation.id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (hasAuth) void reloadEnquiry();
  }, [hasAuth, reloadEnquiry]);

  useEffect(() => {
    if (enquiry) loadConversations();
  }, [enquiry, loadConversations]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function handleOpenReply(conversation: Conversation) {
    setReplyConversationId(conversation.id);
    setReplyBody('');
  }

  async function handleSendReply() {
    if (!supabase || !replyConversationId || !replyBody.trim()) return;
    setSending(true);
    try {
      await sendMessage(supabase, replyConversationId, replyBody.trim());
      setReplyBody('');
      setReplyConversationId(null);
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  async function handleTakeover() {
    if (!supabase || !selectedConversation) return;
    try {
      await takeoverConversation(supabase, selectedConversation.id);
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleHandback() {
    if (!supabase || !selectedConversation) return;
    try {
      await supabase.rpc('handback-conversation', { p_conversation_id: selectedConversation.id });
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkRead() {
    if (!supabase || !enquiry) return;
    try {
      await markEnquiryRead(supabase, enquiryId);
      await reloadEnquiry();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStartConversation() {
    if (!supabase || !enquiry) return;
    try {
      await startConversation(supabase, {
        organization_id: '',
        property_id: enquiry.property_id,
        enquiry_id: enquiryId,
        channel: 'email',
        guest_body: '',
        external_thread_id: '',
      });
      await loadConversations();
    } catch (err) {
      console.error(err);
    }
  }

  if (!hasAuth) {
    return (
      <section aria-labelledby="enquiry-heading">
        <h1 id="enquiry-heading">Enquiry</h1>
        <EmptyState title="Authentication required" message="Sign in to view enquiry details." />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="enquiry-heading">
        <h1 id="enquiry-heading">Enquiry</h1>
        <LoadingState label="Loading enquiry" />
      </section>
    );
  }

  if (status === 'error' || !enquiry) {
    return (
      <section aria-labelledby="enquiry-heading">
        <h1 id="enquiry-heading">Enquiry</h1>
        <ErrorState message="Enquiry could not be loaded." onRetry={() => void reloadEnquiry()} />
      </section>
    );
  }

  return (
    <section aria-labelledby="enquiry-heading">
      <div className="page-header">
        <div>
          <h1 id="enquiry-heading">{enquiry.subject ?? enquiry.topic ?? 'Enquiry'}</h1>
          <p className="page-description">
            {enquiry.channel} · {enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : ''}
            {' · '}
            <Badge status={enquiry.status} tone={statusTone[enquiry.status] ?? 'info'} />
            {enquiry.unread && <Badge status="Unread" tone="warning" />}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={() => void handleMarkRead()} disabled={!enquiry.unread}>
            Mark as read
          </Button>
          <Button onClick={() => void handleOpenReply(selectedConversation!)} disabled={!selectedConversation}>
            Reply
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-6)' }}>
        <aside className="enquiry-sidebar">
          <div className="card">
            <h3>Guest</h3>
            <p className="table-primary">{enquiry.guest_id ?? 'Unknown'}</p>
            {enquiry.reservation_id && (
              <p className="table-secondary">Reservation: {enquiry.reservation_id}</p>
            )}
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Property</h3>
            <p className="table-primary">{enquiry.property_id}</p>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Details</h3>
            <dl className="enquiry-meta">
              <div>
                <dt>Channel</dt>
                <dd>{enquiry.channel}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{enquiry.source ?? '—'}</dd>
              </div>
              <div>
                <dt>Topic</dt>
                <dd>{enquiry.topic ?? '—'}</dd>
              </div>
              <div>
                <dt>Follow-up</dt>
                <dd>{enquiry.follow_up_at ? new Date(enquiry.follow_up_at).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt>Assignee</dt>
                <dd>{enquiry.assigned_to ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>{enquiry.outcome ?? '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Conversations</h3>
            {conversations.length === 0 ? (
              <Button variant="outline" onClick={() => void handleStartConversation()}>
                Start conversation
              </Button>
            ) : (
              <ul className="conversation-list">
                {conversations.map((conv) => (
                  <li key={conv.id} className={selectedConversation?.id === conv.id ? 'active' : ''}>
                    <Button
                      variant="ghost"
                      className="conversation-item"
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <span>{conv.channel}</span>
                      <Badge
                        status={conv.human_takeover ? 'Human takeover' : 'Automated'}
                        tone={conv.human_takeover ? 'warning' : 'info'}
                      />
                    </Button>
                    {conv.human_takeover ? (
                      <Button variant="ghost" onClick={() => void handleHandback()}>
                        Hand back
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => void handleTakeover()}>
                        Take over
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="enquiry-main">
          <div className="messages-panel">
            {selectedConversation ? (
              <>
                <div className="messages-header">
                  <h2>Conversation — {selectedConversation.channel}</h2>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {selectedConversation.human_takeover ? (
                      <Badge status="Human takeover" tone="warning" />
                    ) : (
                      <Badge status="Automated" tone="info" />
                    )}
                  </div>
                </div>
                <div className="messages-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {messages.length === 0 ? (
                    <EmptyState title="No messages" message="Start a conversation to send messages." />
                  ) : (
                    <ul className="message-list">
                      {messages.map((msg) => (
                        <li key={msg.id} className={`message ${msg.role === 'user' ? 'inbound' : 'outbound'}`}>
                          <div className="message-header">
                            <span className="message-role">{msg.role === 'user' ? 'Guest' : 'Agent'}</span>
                            <span className="message-time">{new Date(msg.created_at).toLocaleString()}</span>
                            {msg.confidence !== null && (
                              <Badge status={`${Math.round(msg.confidence * 100)}% confidence`} tone="info" />
                            )}
                            {msg.requires_approval && <Badge status="Needs approval" tone="warning" />}
                          </div>
                          <p className="message-body">{msg.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {replyConversationId === selectedConversation.id && (
                  <div className="reply-form" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                    <div className="field">
                      <label htmlFor="reply-body">Reply</label>
                      <textarea
                        id="reply-body"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Type your reply..."
                        style={{ minHeight: '100px', width: '100%' }}
                      />
                    </div>
                    <div className="dialog-actions" style={{ marginTop: 'var(--space-3)' }}>
                      <Button variant="ghost" onClick={() => setReplyConversationId(null)}>Cancel</Button>
                      <Button type="submit" loading={sending} onClick={() => void handleSendReply()}>
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Select a conversation" message="Choose a conversation from the sidebar to view messages." />
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

export function EnquiryDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <EnquiryDetailPage enquiryId={id ?? ''} />;
}