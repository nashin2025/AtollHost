import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { createContentItem, updateContentItem } from '../../lib/content';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

interface ContentForm {
  title: string;
  body: string;
  channel: string;
  status: string;
  scheduled_for: string;
}

const emptyForm: ContentForm = {
  title: '',
  body: '',
  channel: 'website',
  status: 'draft',
  scheduled_for: '',
};

interface Props {
  contentId?: string;
  propertyId?: string;
}

export function ContentEditorPage({ contentId, propertyId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<ContentForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = supabase !== null;
  const targetPropertyId = propertyId ?? 'default-property';

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    setError(null);
    try {
      if (contentId) {
        const { data } = await supabase
          .from('content_calendar')
          .select('*')
          .eq('id', contentId)
          .single();
        if (data) {
          setForm({
            title: data.title,
            body: data.body ?? '',
            channel: data.channel,
            status: data.status,
            scheduled_for: data.scheduled_for ? new Date(data.scheduled_for).toISOString().slice(0, 16) : '',
          });
        }
      } else {
        setIsNew(true);
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [contentId]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !targetPropertyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        property_id: targetPropertyId,
        organization_id: '',
        title: form.title,
        body: form.body,
        channel: form.channel,
        source: 'manual' as const,
        status: form.status as 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled',
        scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
        external_id: null,
        external_url: null,
        metadata: {},
      };
      if (isNew) {
        await createContentItem(supabase, payload);
      } else {
        await updateContentItem(supabase, contentId!, {
          title: form.title,
          body: form.body,
          channel: form.channel,
          status: form.status as 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled',
          scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
        });
      }
      if (isNew) {
        setIsNew(false);
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasAuth) {
    return (
      <section aria-labelledby="content-heading">
        <h1 id="content-heading">{isNew ? 'Create' : 'Edit'} content</h1>
        <ErrorState message="Authentication required. Sign in to manage content." onRetry={() => {}} />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="content-heading">
        <h1 id="content-heading">{isNew ? 'Create' : 'Edit'} content</h1>
        <LoadingState label="Loading content" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="content-heading">
        <h1 id="content-heading">{isNew ? 'Create' : 'Edit'} content</h1>
        <ErrorState message="Content could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  return (
    <section aria-labelledby="content-heading">
      <div className="page-header">
        <div>
          <h1 id="content-heading">{isNew ? 'Create content' : 'Edit content'}</h1>
          <p className="page-description">
            Write, schedule, and publish marketing content for your property.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={paths.content}>
            <Button variant="outline">Back to content</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          <main style={{ minWidth: 0 }}>
            <Field
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Content title"
            />

            <div className="field">
              <label htmlFor="content-body">Body</label>
              <textarea
                id="content-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
                placeholder="Content body (markdown supported)"
                style={{ minHeight: '300px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <SelectField
                label="Channel"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                required
              >
                <option value="website">Website</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push notification</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="other">Other</option>
              </SelectField>

              <SelectField
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                required
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </SelectField>
            </div>

            <Field
              label="Scheduled for"
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
              optional
              helper="Leave empty to publish immediately or save as draft"
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <div className="dialog-actions" style={{ marginTop: 'var(--space-4)' }}>
              <Link to={paths.content}>
                <Button variant="secondary" type="button">Cancel</Button>
              </Link>
              <Button type="submit" loading={submitting}>
                {isNew ? 'Create' : 'Save'}
              </Button>
            </div>
          </main>

          <aside>
            <div className="card">
              <h3>Preview</h3>
              <div className="content-preview">
                <h4>{form.title || 'Untitled'}</h4>
                <p className="preview-channel">
                  <Badge status={form.channel} tone="info" />
                </p>
                <div className="preview-body">
                  {form.body || 'Content body will appear here...'}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3>Channel guidelines</h3>
              <ul className="guideline-list">
                <li><strong>Website:</strong> Full content with images, SEO optimized</li>
                <li><strong>Instagram:</strong> Visual-first, 2200 chars max, hashtags</li>
                <li><strong>Facebook:</strong> Engaging copy, link preview, 63k chars max</li>
                <li><strong>Twitter/X:</strong> 280 chars max, hashtags, thread support</li>
                <li><strong>LinkedIn:</strong> Professional tone, 3000 chars max</li>
                <li><strong>Email:</strong> HTML support, personalization tokens</li>
              </ul>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3>Status flow</h3>
              <p className="status-flow">
                Draft → Scheduled → Published
              </p>
              <p className="status-flow">
                Draft → Cancelled
              </p>
              <p className="status-flow">
                Scheduled → Published (auto)
              </p>
            </div>
          </aside>
        </div>
      </form>
    </section>
  );
}

export function ContentEditorPageWrapper() {
  const { id, propertyId } = useParams<{ id?: string; propertyId?: string }>();
  return <ContentEditorPage contentId={id} propertyId={propertyId} />;
}