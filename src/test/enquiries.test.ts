import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '../lib/supabase';
import {
  addMessageAttachment,
  handbackConversation,
  listConversationMessages,
  listConversations,
  listEnquiries,
  listMessageAttachments,
  markEnquiryRead,
  sendMessage,
  startConversation,
  takeoverConversation,
  updateEnquiry,
  upsertEnquiry,
  type EnquiryForm,
} from '../lib/enquiries';

function mockQuery(data: unknown, error: unknown = null) {
  const thenable: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'in', 'eq']) {
    thenable[method] = vi.fn(() => thenable);
  }
  thenable.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data, error });
  return thenable;
}

function mockClient(options: {
  query?: { data: unknown; error?: unknown };
  invoke?: { data: unknown; error?: unknown };
}) {
  return {
    from: vi.fn(() =>
      mockQuery(options.query?.data ?? [], options.query?.error ?? null),
    ),
    functions: {
      invoke: vi.fn(() =>
        Promise.resolve({
          data: options.invoke?.data ?? {},
          error: options.invoke?.error ?? null,
        }),
      ),
    },
  } as unknown as SupabaseClient;
}

const enquiryForm: EnquiryForm = {
  enquiry_id: null,
  organization_id: 'org1',
  property_id: 'p1',
  guest_id: null,
  reservation_id: null,
  channel: 'email',
  source: 'website',
  topic: 'booking question',
  subject: 'When is check-in?',
  assigned_to: null,
  follow_up_at: null,
  urgent: false,
  external_id: null,
};

describe('listEnquiries', () => {
  it('lists enquiries for the property', async () => {
    const rows = [
      { id: 'e1', property_id: 'p1', status: 'new', unread: true },
    ];
    const client = mockClient({ query: { data: rows } });
    const enquiries = await listEnquiries(client, 'p1');
    expect(enquiries).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('enquiries');
  });

  it('propagates query errors', async () => {
    const client = mockClient({
      query: { data: null, error: { message: 'denied' } },
    });
    await expect(listEnquiries(client, 'p1')).rejects.toThrow(
      'denied',
    );
  });
});

describe('upsertEnquiry', () => {
  it('sends the form to the upsert-enquiry function', async () => {
    const client = mockClient({ invoke: { data: { enquiry_id: 'e1' } } });
    const result = await upsertEnquiry(client, enquiryForm);
    expect(result.enquiry_id).toBe('e1');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'upsert-enquiry',
      { body: enquiryForm },
    );
  });

  it('surfaces function errors', async () => {
    const client = mockClient({
      invoke: { data: null, error: { message: 'channel is required' } },
    });
    await expect(upsertEnquiry(client, enquiryForm)).rejects.toThrow(
      'channel is required',
    );
  });
});

describe('updateEnquiry', () => {
  it('sends the transition to the update-enquiry function', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await updateEnquiry(client, 'e1', 'open', 'qualified', null);
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'update-enquiry',
      {
        body: {
          enquiry_id: 'e1',
          status: 'open',
          outcome: 'qualified',
          follow_up_at: null,
        },
      },
    );
  });
});

describe('markEnquiryRead', () => {
  it('sends the enquiry id to the mark-enquiry-read function', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await markEnquiryRead(client, 'e1');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'mark-enquiry-read',
      { body: { enquiry_id: 'e1' } },
    );
  });
});

describe('listConversations', () => {
  it('lists conversations for the property', async () => {
    const rows = [
      { id: 'c1', property_id: 'p1', human_takeover: false },
    ];
    const client = mockClient({ query: { data: rows } });
    const conversations = await listConversations(client, 'p1');
    expect(conversations).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('conversations');
  });
});

describe('listConversationMessages', () => {
  it('lists messages oldest first', async () => {
    const rows = [
      { id: 'm1', conversation_id: 'c1', role: 'guest' },
    ];
    const client = mockClient({ query: { data: rows } });
    const messages = await listConversationMessages(client, 'c1');
    expect(messages).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('conversation_messages');
  });
});

describe('listMessageAttachments', () => {
  it('returns an empty list without querying for no messages', async () => {
    const client = mockClient({ query: { data: [] } });
    const attachments = await listMessageAttachments(client, []);
    expect(attachments).toEqual([]);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('lists attachments for the given messages', async () => {
    const rows = [
      { id: 'a1', message_id: 'm1', mime_type: 'application/pdf' },
    ];
    const client = mockClient({ query: { data: rows } });
    const attachments = await listMessageAttachments(client, ['m1']);
    expect(attachments).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith('message_attachments');
  });
});

describe('startConversation', () => {
  it('sends the form to the start-conversation function', async () => {
    const client = mockClient({
      invoke: { data: { conversation_id: 'c1' } },
    });
    const result = await startConversation(client, {
      organization_id: 'org1',
      property_id: 'p1',
      enquiry_id: null,
      channel: 'email',
      guest_body: 'Hello',
      external_thread_id: null,
    });
    expect(result.conversation_id).toBe('c1');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'start-conversation',
      {
        body: {
          organization_id: 'org1',
          property_id: 'p1',
          enquiry_id: null,
          channel: 'email',
          guest_body: 'Hello',
          external_thread_id: null,
        },
      },
    );
  });
});

describe('sendMessage', () => {
  it('sends the body to the send-message function', async () => {
    const client = mockClient({ invoke: { data: { message_id: 'm1' } } });
    const result = await sendMessage(client, 'c1', 'Hello');
    expect(result.message_id).toBe('m1');
    expect(client.functions.invoke).toHaveBeenCalledWith('send-message', {
      body: { conversation_id: 'c1', body: 'Hello' },
    });
  });
});

describe('takeoverConversation', () => {
  it('calls the takeover-conversation function', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await takeoverConversation(client, 'c1');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'takeover-conversation',
      { body: { conversation_id: 'c1' } },
    );
  });
});

describe('handbackConversation', () => {
  it('calls the handback-conversation function', async () => {
    const client = mockClient({ invoke: { data: {} } });
    await handbackConversation(client, 'c1');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'handback-conversation',
      { body: { conversation_id: 'c1' } },
    );
  });
});

describe('addMessageAttachment', () => {
  it('sends attachment metadata to the add-message-attachment function', async () => {
    const client = mockClient({
      invoke: { data: { attachment_id: 'a1' } },
    });
    const result = await addMessageAttachment(
      client,
      'm1',
      'attachments/m1/photo.png',
      'image/png',
      2048,
      null,
    );
    expect(result.attachment_id).toBe('a1');
    expect(client.functions.invoke).toHaveBeenCalledWith(
      'add-message-attachment',
      {
        body: {
          message_id: 'm1',
          storage_path: 'attachments/m1/photo.png',
          mime_type: 'image/png',
          size_bytes: 2048,
          checksum: null,
        },
      },
    );
  });
});
