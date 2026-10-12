import { invokeFunction } from './api';
import type { SupabaseClient } from './supabase';

export interface Enquiry {
  id: string;
  property_id: string;
  guest_id: string | null;
  reservation_id: string | null;
  channel: string;
  source: string | null;
  topic: string | null;
  subject: string | null;
  status: string;
  assigned_to: string | null;
  follow_up_at: string | null;
  outcome: string | null;
  external_id: string | null;
  unread: boolean;
  urgent: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnquiryForm {
  enquiry_id: string | null;
  organization_id: string;
  property_id: string;
  guest_id: string | null;
  reservation_id: string | null;
  channel: string;
  source: string | null;
  topic: string | null;
  subject: string | null;
  assigned_to: string | null;
  follow_up_at: string | null;
  urgent: boolean | null;
  external_id: string | null;
}

export interface Conversation {
  id: string;
  property_id: string;
  guest_id: string | null;
  enquiry_id: string | null;
  channel: string;
  external_thread_id: string | null;
  human_takeover: boolean;
  automation_paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: string;
  body: string;
  confidence: number | null;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  external_message_id: string | null;
  created_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  checksum: string | null;
  scan_status: string;
  created_at: string;
}

export interface ConversationForm {
  organization_id: string;
  property_id: string;
  enquiry_id: string | null;
  channel: string;
  guest_body: string | null;
  external_thread_id: string | null;
}

export const ENQUIRY_TRANSITIONS: Record<string, string[]> = {
  new: ['open', 'closed'],
  open: ['waiting', 'won', 'lost', 'closed'],
  waiting: ['open', 'won', 'lost', 'closed'],
  won: ['closed'],
  lost: ['closed'],
  closed: ['open'],
};

export async function listEnquiries(
  client: SupabaseClient,
  propertyId: string,
): Promise<Enquiry[]> {
  const { data, error } = await client
    .from('enquiries')
    .select(
      'id, property_id, guest_id, reservation_id, channel, source, topic, subject, status, assigned_to, follow_up_at, outcome, external_id, unread, urgent, created_at, updated_at',
    )
    .eq('property_id', propertyId)
    .order('updated_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Enquiry[];
}

export async function upsertEnquiry(
  client: SupabaseClient,
  form: EnquiryForm,
): Promise<{ enquiry_id: string }> {
  return invokeFunction<{ enquiry_id: string }>(
    client,
    'upsert-enquiry',
    form,
  );
}

export async function updateEnquiry(
  client: SupabaseClient,
  enquiryId: string,
  status: string | null,
  outcome: string | null,
  followUpAt: string | null,
): Promise<void> {
  await invokeFunction(client, 'update-enquiry', {
    enquiry_id: enquiryId,
    status,
    outcome,
    follow_up_at: followUpAt,
  });
}

export async function markEnquiryRead(
  client: SupabaseClient,
  enquiryId: string,
): Promise<void> {
  await invokeFunction(client, 'mark-enquiry-read', {
    enquiry_id: enquiryId,
  });
}

export async function listConversations(
  client: SupabaseClient,
  propertyId: string,
): Promise<Conversation[]> {
  const { data, error } = await client
    .from('conversations')
    .select(
      'id, property_id, guest_id, enquiry_id, channel, external_thread_id, human_takeover, automation_paused, created_at, updated_at',
    )
    .eq('property_id', propertyId)
    .order('updated_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as Conversation[];
}

export async function listConversationMessages(
  client: SupabaseClient,
  conversationId: string,
): Promise<ConversationMessage[]> {
  const { data, error } = await client
    .from('conversation_messages')
    .select(
      'id, conversation_id, role, body, confidence, requires_approval, approved_by, approved_at, external_message_id, created_at',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as ConversationMessage[];
}

export async function listMessageAttachments(
  client: SupabaseClient,
  messageIds: string[],
): Promise<MessageAttachment[]> {
  if (messageIds.length === 0) {
    return [];
  }
  const { data, error } = await client
    .from('message_attachments')
    .select(
      'id, message_id, storage_path, mime_type, size_bytes, checksum, scan_status, created_at',
    )
    .in('message_id', messageIds);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as MessageAttachment[];
}

export async function startConversation(
  client: SupabaseClient,
  form: ConversationForm,
): Promise<{ conversation_id: string }> {
  return invokeFunction<{ conversation_id: string }>(
    client,
    'start-conversation',
    form,
  );
}

export async function sendMessage(
  client: SupabaseClient,
  conversationId: string,
  body: string,
): Promise<{ message_id: string }> {
  return invokeFunction<{ message_id: string }>(client, 'send-message', {
    conversation_id: conversationId,
    body,
  });
}

export async function takeoverConversation(
  client: SupabaseClient,
  conversationId: string,
): Promise<void> {
  await invokeFunction(client, 'takeover-conversation', {
    conversation_id: conversationId,
  });
}

export async function handbackConversation(
  client: SupabaseClient,
  conversationId: string,
): Promise<void> {
  await invokeFunction(client, 'handback-conversation', {
    conversation_id: conversationId,
  });
}

export async function addMessageAttachment(
  client: SupabaseClient,
  messageId: string,
  storagePath: string,
  mimeType: string,
  sizeBytes: number,
  checksum: string | null,
): Promise<{ attachment_id: string }> {
  return invokeFunction<{ attachment_id: string }>(
    client,
    'add-message-attachment',
    {
      message_id: messageId,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      checksum,
    },
  );
}
