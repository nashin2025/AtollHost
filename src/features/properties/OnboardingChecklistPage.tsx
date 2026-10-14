import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { supabase } from '../../lib/supabase';
import { paths } from '../../router';

const CHECKLIST_TEMPLATE = [
  // Business details
  { id: 'name', label: 'Property name', description: 'Official property name registered', required: true, category: 'business' as const },
  { id: 'type', label: 'Property type', description: 'Guesthouse, hotel, resort, etc.', required: true, category: 'business' as const },
  { id: 'island', label: 'Island', description: 'Maldives island where property is located', required: true, category: 'business' as const },
  { id: 'atoll', label: 'Atoll', description: 'Atoll name for the island', required: false, category: 'business' as const },
  { id: 'phone', label: 'Phone number', description: 'Primary contact number', required: true, category: 'business' as const },
  { id: 'email', label: 'Email address', description: 'Primary contact email', required: true, category: 'business' as const },
  { id: 'address', label: 'Physical address', description: 'Full address including island/atoll', required: false, category: 'business' as const },
  
  // Owner access
  { id: 'owner_id', label: 'Owner user ID', description: 'Owner must be invited and accept', required: true, category: 'owner' as const },
  { id: 'owner_access', label: 'Owner permissions granted', description: 'Owner has been granted access to their portal', required: true, category: 'owner' as const },
  
  // Knowledge base
  { id: 'brain_drafts', label: 'Property Brain drafts created', description: 'Key facts drafted for AI assistant', required: true, category: 'knowledge' as const },
  { id: 'brain_sources', label: 'Sources verified', description: 'All facts have verified sources', required: true, category: 'knowledge' as const },
  { id: 'brain_approved', label: 'Knowledge approved', description: 'Facts approved for AI use', required: true, category: 'knowledge' as const },
  
  // Operations
  { id: 'rooms', label: 'Rooms configured', description: 'At least one room type defined', required: true, category: 'operations' as const },
  { id: 'services', label: 'Services defined', description: 'Property services listed', required: false, category: 'operations' as const },
  { id: 'policies', label: 'Policies documented', description: 'Cancellation, check-in/out, house rules', required: true, category: 'operations' as const },
  { id: 'contacts', label: 'Emergency contacts', description: 'Local emergency and property contacts', required: true, category: 'operations' as const },
  { id: 'integrations', label: 'Integrations configured', description: 'PMS, channel manager, payment gateway', required: false, category: 'operations' as const },
  
  // Documents
  { id: 'license', label: 'Business license', description: 'Tourism ministry license uploaded', required: true, category: 'documents' as const },
  { id: 'insurance', label: 'Insurance certificate', description: 'Property insurance document', required: true, category: 'documents' as const },
  { id: 'photos', label: 'Property photos', description: 'At least 10 photos uploaded', required: false, category: 'documents' as const },
];

interface Props {
  propertyId: string;
}

export function OnboardingChecklistPage({ propertyId }: Props) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [items, setItems] = useState<{ id: string; label: string; description: string; completed: boolean; required: boolean; category: string }[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['business', 'owner', 'knowledge', 'operations', 'documents']);

  const reload = useCallback(async () => {
    if (!supabase) return;
    setStatus('loading');
    try {
      const { data: property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      const { data: ownerAccess } = await supabase
        .from('owner_property_access')
        .select('*')
        .eq('property_id', propertyId)
        .eq('revoked_at', null);

      const { data: brainItems } = await supabase
        .from('knowledge_items')
        .select('status, source')
        .eq('property_id', propertyId);

      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('property_id', propertyId);

      const { data: integrations } = await supabase
        .from('integrations')
        .select('id')
        .eq('property_id', propertyId);

      const updatedItems = CHECKLIST_TEMPLATE.map(item => {
        let completed = false;
        switch (item.id) {
          case 'name': completed = !!property?.name; break;
          case 'type': completed = !!property?.type; break;
          case 'island': completed = !!property?.island; break;
          case 'atoll': completed = !!property?.atoll; break;
          case 'phone': completed = !!property?.phone; break;
          case 'email': completed = !!property?.email; break;
          case 'address': completed = !!property?.address; break;
          case 'owner_id': completed = !!ownerAccess?.length; break;
          case 'owner_access': completed = !!ownerAccess?.some(o => !o.revoked_at); break;
          case 'brain_drafts': completed = !!brainItems?.some(b => b.status !== 'archived'); break;
          case 'brain_sources': completed = !!brainItems?.some(b => b.source); break;
          case 'brain_approved': completed = !!brainItems?.some(b => b.status === 'approved'); break;
          case 'rooms': completed = !!rooms?.length; break;
          case 'integrations': completed = !!integrations?.length; break;
        }
        return { ...item, completed };
      });

      setItems(updatedItems);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [propertyId]);

  useEffect(() => {
    if (supabase) void reload();
  }, [supabase, reload]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const categoryItems = (category: string) => items.filter(i => i.category === category);
  const categoryCompleted = (category: string) => categoryItems(category).filter(i => i.completed).length;
  const categoryTotal = (category: string) => categoryItems(category).length;
  const categoryRequired = (category: string) => categoryItems(category).filter(i => i.required).length;
  const categoryRequiredCompleted = (category: string) => categoryItems(category).filter(i => i.required && i.completed).length;

  const allRequired = items.filter(i => i.required).length;
  const allRequiredCompleted = items.filter(i => i.required && i.completed).length;

  const categories = [
    { id: 'business', label: 'Business details', icon: '🏢' },
    { id: 'owner', label: 'Owner access', icon: '👤' },
    { id: 'knowledge', label: 'Property Brain', icon: '🧠' },
    { id: 'operations', label: 'Operations setup', icon: '⚙️' },
    { id: 'documents', label: 'Documents', icon: '📄' },
  ];

  const hasAuth = supabase !== null;

  if (!hasAuth) {
    return (
      <section aria-labelledby="checklist-heading">
        <h1 id="checklist-heading">Onboarding checklist</h1>
        <ErrorState message="Authentication required. Sign in to view onboarding checklist." onRetry={() => {}} />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="checklist-heading">
        <h1 id="checklist-heading">Onboarding checklist</h1>
        <LoadingState label="Loading onboarding checklist" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="checklist-heading">
        <h1 id="checklist-heading">Onboarding checklist</h1>
        <ErrorState message="Checklist could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  return (
    <section aria-labelledby="checklist-heading">
      <div className="page-header">
        <div>
          <h1 id="checklist-heading">Onboarding checklist</h1>
          <p className="page-description">
            Track missing information and setup progress for this property.
            {allRequiredCompleted === allRequired ? (
              <span className="badge-success"> Ready for operation </span>
            ) : (
              <span className="badge-warning"> {allRequiredCompleted}/{allRequired} required complete </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={paths.propertyDetail.replace(':id', propertyId)}>
            <Button variant="outline">Back to property</Button>
          </Link>
          <Button onClick={() => void reload()}>Refresh</Button>
        </div>
      </div>

      <div className="checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {categories.map(cat => {
          const catItems = categoryItems(cat.id);
          const completed = categoryCompleted(cat.id);
          const total = categoryTotal(cat.id);
          const reqCompleted = categoryRequiredCompleted(cat.id);
          const reqTotal = categoryRequired(cat.id);
          const isExpanded = expandedCategories.includes(cat.id);

          return (
            <section key={cat.id} className="checklist-category" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                className="category-header"
                onClick={() => toggleCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  background: 'var(--color-surface)',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                  <div>
                    <h3 style={{ margin: 0 }}>{cat.label}</h3>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      {completed}/{total} complete · {reqCompleted}/{reqTotal} required
                    </p>
                  </div>
                </div>
                <Badge
                  status={completed === total ? 'Complete' : 'In progress'}
                  tone={completed === total ? 'success' : 'warning'}
                />
              </button>

              {isExpanded && (
                <div className="category-items" style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {catItems.map(item => (
                      <li key={item.id} className="checklist-item" style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3)',
                        background: item.completed ? 'var(--color-success-bg)' : 'transparent',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        transition: 'background 150ms ease',
                      }}>
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled
                          style={{
                            width: '1.25rem',
                            height: '1.25rem',
                            accentColor: 'var(--color-primary)',
                            marginTop: '0.125rem',
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <strong>{item.label}</strong>
                            {item.required && <Badge status="Required" tone="warning" />}
                          </div>
                          <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                            {item.description}
                          </p>
                        </div>
                        {item.completed && <Badge status="Done" tone="success" />}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="checklist-summary" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
        <h3>Summary</h3>
        <p>
          {allRequiredCompleted} of {allRequired} required items complete.
          {allRequiredCompleted === allRequired
            ? ' Property is ready for operation.'
            : ` ${allRequired - allRequiredCompleted} required items remaining.`}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <Button variant="outline" onClick={() => {
            const allExpanded = categories.every(c => expandedCategories.includes(c.id));
            setExpandedCategories(allExpanded ? [] : categories.map(c => c.id));
          }}>
            {expandedCategories.length === categories.length ? 'Collapse all' : 'Expand all'}
          </Button>
          <Link to={paths.propertyDetail.replace(':id', propertyId)}>
            <Button>View property</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function OnboardingChecklistPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <OnboardingChecklistPage propertyId={id ?? ''} />;
}