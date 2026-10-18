import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States';
import {
  addMessageAttachment,
  listConversations,
  listConversationMessages,
  listMessageAttachments,
  sendMessage,
  startConversation,
  takeoverConversation,
  handbackConversation,
  type Conversation,
  type ConversationMessage,
  type MessageAttachment,
} from '../../lib/enquiries';
import { listEnquiries } from '../../lib/enquiries';
import {
  generateAiDraft,
  approveAiDraft,
  rejectAiDraft,
  type AiDraft,
  type GenerateAiDraftResult,
} from '../../lib/aiDrafts';
import { listProperties, type Property } from '../../lib/properties';
import { supabase } from '../../lib/supabase';

const roleTone: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  guest: 'info',
  human: 'success',
  system: 'neutral',
  ai: 'warning',
};

interface ConversationFormState {
  channel: string;
  enquiryId: string;
  guestBody: string;
}

const emptyConversationForm: ConversationFormState = {
  channel: 'email',
  enquiryId: '',
  guestBody: '',
};

interface AiDraftDialogState {
  open: boolean;
  draft: AiDraft | GenerateAiDraftResult | null;
  loading: boolean;
  error: string | null;
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function InboxPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [enquiries, setEnquiries] = useState<{ id: string; subject: string | null }[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [compose, setCompose] = useState('');
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [conversationForm, setConversationForm] = useState<ConversationFormState>(emptyConversationForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDraftDialog, setAiDraftDialog] = useState<AiDraftDialogState>({
    open: false,
    draft: null,
    loading: false,
    error: null,
  });

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const propertyRows = await listProperties(supabase);
      setProperties(propertyRows);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (hasAuth) {
      void reload();
    }
  }, [hasAuth, reload]);

  useEffect(() => {
    if (status === 'ready' && selectedPropertyId === '' && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [status, selectedPropertyId, properties]);

  const reloadConversations = useCallback(async () => {
    if (!supabase || selectedPropertyId === '') {
      setConversations([]);
      setEnquiries([]);
      setMessages([]);
      setAttachments([]);
      setSelectedConversationId('');
      return;
    }
    try {
      const [rows, enquiryRows] = await Promise.all([
        listConversations(supabase, selectedPropertyId),
        listEnquiries(supabase, selectedPropertyId),
      ]);
      setConversations(rows);
      setEnquiries(enquiryRows);
      setSelectedConversationId((current) => {
        if (current !== '' && rows.some((row) => row.id === current)) {
          return current;
        }
        return rows[0]?.id ?? '';
      });
    } catch {
      setConversations([]);
      setEnquiries([]);
      setMessages([]);
      setAttachments([]);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (status !== 'ready' || selectedPropertyId === '') {
      return;
    }
    void reloadConversations();
  }, [status, selectedPropertyId, reloadConversations]);

  const reloadMessages = useCallback(async () => {
    if (!supabase || selectedConversationId === '') {
      setMessages([]);
      setAttachments([]);
      return;
    }
    try {
      const rows = await listConversationMessages(
        supabase,
        selectedConversationId,
      );
      setMessages(rows);
      const attachmentRows = await listMessageAttachments(
        supabase,
        rows.map((row) => row.id),
      );
      setAttachments(attachmentRows);
    } catch {
      setMessages([]);
      setAttachments([]);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    void reloadMessages();
  }, [status, reloadMessages]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="inbox-heading">
        <h1 id="inbox-heading">Inbox</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage guest conversations."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="inbox-heading">
        <h1 id="inbox-heading">Inbox</h1>
        <LoadingState label="Loading conversations" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="inbox-heading">
        <h1 id="inbox-heading">Inbox</h1>
        <ErrorState
          message="Conversations could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const selectedConversation =
    conversations.find((row) => row.id === selectedConversationId) ?? null;

  const attachmentsFor = (messageId: string): MessageAttachment[] =>
    attachments.filter((row) => row.message_id === messageId);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!supabase || selectedConversation === null || compose.trim() === '') {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await sendMessage(supabase, selectedConversation.id, compose.trim());
      setCompose('');
      await reloadMessages();
      await reloadConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTakeover() {
    if (!supabase || selectedConversation === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await takeoverConversation(supabase, selectedConversation.id);
      await reloadMessages();
      await reloadConversations();
    } catch (takeoverError) {
      setError(
        takeoverError instanceof Error ? takeoverError.message : null,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHandback() {
    if (!supabase || selectedConversation === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await handbackConversation(supabase, selectedConversation.id);
      await reloadMessages();
      await reloadConversations();
    } catch (handbackError) {
      setError(
        handbackError instanceof Error ? handbackError.message : null,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openStartDialog() {
    setConversationForm(emptyConversationForm);
    setError(null);
    setStartDialogOpen(true);
  }

  async function handleStart(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    const property = properties.find((row) => row.id === selectedPropertyId);
    if (!property) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await startConversation(supabase, {
        organization_id: property.organization_id,
        property_id: property.id,
        enquiry_id:
          conversationForm.enquiryId === ''
            ? null
            : conversationForm.enquiryId,
        channel: conversationForm.channel,
        guest_body:
          conversationForm.guestBody.trim() === ''
            ? null
            : conversationForm.guestBody.trim(),
        external_thread_id: null,
      });
      setStartDialogOpen(false);
      await reloadConversations();
      setSelectedConversationId(result.conversation_id);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAttach(messageId: string, file: File) {
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    const storagePath = `attachments/${messageId}/${file.name}`;
    try {
      await addMessageAttachment(
        supabase,
        messageId,
        storagePath,
        file.type,
        file.size,
        null,
      );
      await reloadMessages();
    } catch (attachError) {
      setError(
        attachError instanceof Error ? attachError.message : null,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateAiDraft() {
    if (!supabase || selectedConversation === null) {
      return;
    }
    const property = properties.find((row) => row.id === selectedPropertyId);
    if (!property) {
      return;
    }
    setAiDraftDialog({ open: true, draft: null, loading: true, error: null });
    try {
      const result = await generateAiDraft(supabase, {
        conversation_id: selectedConversation.id,
        property_id: property.id,
        organization_id: property.organization_id,
        prompt_version: 'v1.0',
      });
      setAiDraftDialog({ open: true, draft: result, loading: false, error: null });
    } catch (genError) {
      setAiDraftDialog((prev) => ({
        ...prev,
        loading: false,
        error: genError instanceof Error ? genError.message : 'Failed to generate draft',
      }));
    }
  }

  async function handleApproveAiDraft() {
    if (!supabase || aiDraftDialog.draft === null || 'draft_id' in aiDraftDialog.draft === false) {
      return;
    }
    const draftId = (aiDraftDialog.draft as GenerateAiDraftResult).draft_id;
    setAiDraftDialog((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await approveAiDraft(supabase, draftId);
      setAiDraftDialog({ open: false, draft: null, loading: false, error: null });
      await reloadMessages();
      await reloadConversations();
    } catch (approveError) {
      setAiDraftDialog((prev) => ({
        ...prev,
        loading: false,
        error: approveError instanceof Error ? approveError.message : 'Failed to approve draft',
      }));
    }
  }

  async function handleRejectAiDraft() {
    if (!supabase || aiDraftDialog.draft === null || 'draft_id' in aiDraftDialog.draft === false) {
      return;
    }
    const draftId = (aiDraftDialog.draft as GenerateAiDraftResult).draft_id;
    setAiDraftDialog((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await rejectAiDraft(supabase, draftId);
      setAiDraftDialog({ open: false, draft: null, loading: false, error: null });
      await reloadMessages();
      await reloadConversations();
    } catch (rejectError) {
      setAiDraftDialog((prev) => ({
        ...prev,
        loading: false,
        error: rejectError instanceof Error ? rejectError.message : 'Failed to reject draft',
      }));
    }
  }

  async function handleEditAiDraft() {
    if (!supabase || aiDraftDialog.draft === null || 'draft_id' in aiDraftDialog.draft === false) {
      return;
    }
    const draft = aiDraftDialog.draft as GenerateAiDraftResult;
    // Copy the draft body into the compose box so the operator can edit it
    // as a human reply before sending. The AI draft itself is not modified;
    // it must be approved or rejected through the approval flow.
    setCompose(draft.draft_body);
    setAiDraftDialog({ open: false, draft: null, loading: false, error: null });
    setSelectedConversationId(selectedConversation?.id ?? '');
  }

  return (
    <section aria-labelledby="inbox-heading">
      <div className="page-header">
        <div>
          <h1 id="inbox-heading">Inbox</h1>
          <p className="page-description">
            Guest conversation timelines. Human replies are
            sent directly; automation stays paused while a
            human is in control.
          </p>
        </div>
        {properties.length > 0 && (
          <Button onClick={openStartDialog}>Start conversation</Button>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create a property before starting conversations."
        />
      ) : (
        <>
          <div className="field">
            <SelectField
              label="Property"
              value={selectedPropertyId}
              onChange={(event) =>
                setSelectedPropertyId(event.target.value)
              }
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectField>
          </div>

          {conversations.length === 0 ? (
            <EmptyState
              title="No conversations"
              message="Start a conversation to reply to guests."
              action={
                <Button onClick={openStartDialog}>
                  Start conversation
                </Button>
              }
            />
          ) : (
            <div className="inbox-layout">
              <nav aria-label="Conversations">
                <ul className="inbox-list">
                  {conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className={[
                          'inbox-item',
                          conversation.id === selectedConversationId
                            ? 'inbox-item-active'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() =>
                          setSelectedConversationId(conversation.id)
                        }
                      >
                        <span className="table-primary">
                          {conversation.channel.replace(/_/g, ' ')}
                        </span>
                        <span className="badge-stack">
                          {conversation.human_takeover && (
                            <Badge status="human" tone="success" />
                          )}
                          {conversation.automation_paused && (
                            <Badge
                              status="automation paused"
                              tone="warning"
                            />
                          )}
                        </span>
                        <span className="table-secondary">
                          Updated{' '}
                          {new Date(
                            conversation.updated_at,
                          ).toLocaleString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div>
                {selectedConversation === null ? (
                  <EmptyState
                    title="No conversation selected"
                    message="Select a conversation to view its timeline."
                  />
                ) : (
                  <div>
                    <div className="message-meta">
                      <Badge
                        status={selectedConversation.channel.replace(
                          /_/g,
                          ' ',
                        )}
                        tone="info"
                      />
                      {selectedConversation.human_takeover ? (
                        <Badge status="human control" tone="success" />
                      ) : (
                        <Badge status="automation active" tone="neutral" />
                      )}
                      {selectedConversation.enquiry_id && (
                        <span className="table-secondary">
                          Enquiry{' '}
                          {selectedConversation.enquiry_id.slice(0, 8)}
                        </span>
                      )}
                    </div>

                    <h2>Timeline</h2>
                    {messages.length === 0 ? (
                      <EmptyState
                        title="No messages yet"
                        message="Send the first message in this conversation."
                      />
                    ) : (
                      <ul className="message-list">
                        {messages.map((message) => (
                          <li
                            key={message.id}
                            className="message-card"
                          >
                            <div className="message-meta">
                              <Badge
                                status={message.role}
                                tone={
                                  roleTone[message.role] ?? 'neutral'
                                }
                              />
                              <span>
                                {new Date(
                                  message.created_at,
                                ).toLocaleString()}
                              </span>
                              {message.requires_approval && (
                                <Badge
                                  status="requires approval"
                                  tone="warning"
                                />
                              )}
                            </div>
                            <p className="message-body">
                              {message.body}
                            </p>
                            {attachmentsFor(message.id).length >
                              0 && (
                              <ul className="attachment-list">
                                {attachmentsFor(message.id).map(
                                  (attachment) => (
                                    <li key={attachment.id}>
                                      {attachment.storage_path} (
                                      {attachment.mime_type},{' '}
                                      {formatBytes(
                                        attachment.size_bytes,
                                      )}, scan:{' '}
                                      {attachment.scan_status})
                                    </li>
                                  ),
                                )}
                              </ul>
                            )}
                            <div className="dialog-actions">
                              <label
                                className="af-btn af-btn--outline af-btn--sm"
                                style={{
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain"
                                  onChange={(event) => {
                                    const file =
                                      event.target.files?.[0];
                                    if (file) {
                                      void handleAttach(
                                        message.id,
                                        file,
                                      );
                                    }
                                    event.target.value = '';
                                  }}
                                />
                                Attach file
                              </label>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <form
                      className="compose-box"
                      onSubmit={(event) => void handleSend(event)}
                    >
                      <label className="af-field" htmlFor="compose-body">
                        <span className="af-field__label">
                          Reply{' '}
                          <span
                            aria-hidden="true"
                            className="af-field__required"
                          >
                            *
                          </span>
                          <span className="sr-only"> (required)</span>
                        </span>
                        <textarea
                          id="compose-body"
                          className="textarea-field"
                          value={compose}
                          onChange={(event) =>
                            setCompose(event.target.value)
                          }
                          placeholder="Write a reply as a human operator"
                          aria-required="true"
                        />
                      </label>
                      <div className="compose-actions">
                        <span className="table-secondary">
                          Replies are sent immediately as human
                          messages.
                        </span>
                        <div className="dialog-actions">
                          {selectedConversation.human_takeover ? (
                            <Button
                              variant="outline"
                              disabled={submitting}
                              onClick={() => void handleHandback()}
                            >
                              Hand back to automation
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                disabled={submitting}
                                onClick={() => void handleTakeover()}
                              >
                                Take over
                              </Button>
                              <Button
                                variant="secondary"
                                disabled={submitting || selectedConversation.automation_paused}
                                onClick={() => void handleGenerateAiDraft()}
                              >
                                AI Draft
                              </Button>
                            </>
                          )}
                          <Button
                            type="submit"
                            loading={submitting}
                            disabled={compose.trim() === ''}
                          >
                            Send reply
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={startDialogOpen}
        title="Start a conversation"
        onClose={() => setStartDialogOpen(false)}
        describedBy="start-conversation-description"
      >
        <p id="start-conversation-description">
          Creates a conversation on the selected property.
          Optionally link it to an enquiry and add the
          opening guest message.
        </p>
        <form onSubmit={(event) => void handleStart(event)} noValidate>
          <SelectField
            label="Channel"
            value={conversationForm.channel}
            onChange={(event) =>
              setConversationForm({
                ...conversationForm,
                channel: event.target.value,
              })
            }
          >
            <option value="website">Website</option>
            <option value="booking">Booking</option>
            <option value="walk_in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="messaging">Messaging</option>
            <option value="other">Other</option>
          </SelectField>
          <SelectField
            label="Linked enquiry"
            value={conversationForm.enquiryId}
            onChange={(event) =>
              setConversationForm({
                ...conversationForm,
                enquiryId: event.target.value,
              })
            }
            optional
          >
            <option value="">No linked enquiry</option>
            {enquiries.map((enquiry) => (
              <option key={enquiry.id} value={enquiry.id}>
                {enquiry.subject ?? 'Untitled enquiry'}
              </option>
            ))}
          </SelectField>
          <Field
            label="Opening guest message"
            value={conversationForm.guestBody}
            onChange={(event) =>
              setConversationForm({
                ...conversationForm,
                guestBody: event.target.value,
              })
            }
            optional
            placeholder="The guest's first message"
          />
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              onClick={() => setStartDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Start conversation
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={aiDraftDialog.open}
        title="AI Draft Review"
        onClose={() => setAiDraftDialog({ open: false, draft: null, loading: false, error: null })}
        describedBy="ai-draft-description"
      >
        <p id="ai-draft-description">
          Review the AI-generated draft. Approve to send as an AI message,
          reject to discard, or copy to compose to edit as a human reply.
        </p>
        {aiDraftDialog.loading && (
          <div className="dialog-loading">
            <span className="spinner" aria-hidden="true" />
            <span>Generating draft&hellip;</span>
          </div>
        )}
        {!aiDraftDialog.loading && aiDraftDialog.draft && (
          <>
            {(() => {
              const draft = aiDraftDialog.draft as GenerateAiDraftResult;
              return (
                <div className="ai-draft-preview">
                  <label className="field">
                    <span>Draft message</span>
                    <textarea
                      className="textarea-field"
                      value={draft.draft_body}
                      readOnly
                      rows={4}
                    />
                  </label>
                  <div className="ai-draft-meta">
                    <span>
                      Confidence: {(draft.confidence * 100).toFixed(0)}%
                    </span>
                    {draft.source_references.length > 0 && (
                      <span>
                        Sources: {draft.source_references.length}
                      </span>
                    )}
                    {draft.unknown_answers.length > 0 && (
                      <Badge status="unknown answers" tone="warning" />
                    )}
                  </div>
                  <details className="ai-draft-policy">
                    <summary>Policy checks</summary>
                    <ul>
                      {draft.policy.unsupported_facts.length > 0 && (
                        <li>Unsupported facts: {draft.policy.unsupported_facts.join(', ')}</li>
                      )}
                      {draft.policy.sensitive_topics.length > 0 && (
                        <li>Sensitive topics: {draft.policy.sensitive_topics.join(', ')}</li>
                      )}
                      {draft.policy.prompt_injection && (
                        <li>Prompt injection detected</li>
                      )}
                      {draft.policy.action_boundaries.length > 0 && (
                        <li>Action boundaries: {draft.policy.action_boundaries.join(', ')}</li>
                      )}
                      {draft.policy.unsupported_facts.length === 0 &&
                        draft.policy.sensitive_topics.length === 0 &&
                        !draft.policy.prompt_injection &&
                        draft.policy.action_boundaries.length === 0 && (
                          <li>All checks passed</li>
                        )}
                    </ul>
                  </details>
                </div>
            )})()}
            {aiDraftDialog.error && (
              <p className="auth-error" role="alert">
                {aiDraftDialog.error}
              </p>
            )}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                onClick={() => setAiDraftDialog({ open: false, draft: null, loading: false, error: null })}
              >
                Close
              </Button>
              <Button
                variant="outline"
                disabled={aiDraftDialog.loading}
                onClick={() => void handleEditAiDraft()}
              >
                Copy to compose
              </Button>
              <Button
                variant="outline"
                disabled={aiDraftDialog.loading}
                onClick={() => void handleRejectAiDraft()}
              >
                Reject
              </Button>
              <Button
                disabled={aiDraftDialog.loading}
                onClick={() => void handleApproveAiDraft()}
              >
                Approve & Send
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </section>
  );
}