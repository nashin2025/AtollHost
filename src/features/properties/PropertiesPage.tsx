import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { listMyMemberships, type Membership } from '../../lib/memberships';
import {
  assignPropertyMember,
  listOrganizationMembers,
  listProperties,
  listPropertyTeam,
  revokePropertyMember,
  upsertProperty,
  type OrganizationMember,
  type Property,
  type TeamMember,
} from '../../lib/properties';
import { supabase } from '../../lib/supabase';

const propertyStatuses = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

const propertyRoles = [
  { value: 'property_owner', label: 'Property owner' },
  { value: 'property_manager', label: 'Property manager' },
  { value: 'property_staff', label: 'Property staff' },
];

function statusTone(status: string): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'active') {
    return 'success';
  }
  if (status === 'paused') {
    return 'warning';
  }
  if (status === 'archived') {
    return 'neutral';
  }
  return 'info';
}

interface PropertyFormState {
  propertyId: string | null;
  organizationId: string;
  name: string;
  island: string;
  atoll: string;
  phone: string;
  email: string;
  address: string;
  status: string;
}

const emptyForm: PropertyFormState = {
  propertyId: null,
  organizationId: '',
  name: '',
  island: '',
  atoll: '',
  phone: '',
  email: '',
  address: '',
  status: 'onboarding',
};

interface PropertiesData {
  properties: Property[];
  memberships: Membership[];
  teamByProperty: Record<string, TeamMember[]>;
  adminOrgIds: Set<string>;
}

export function PropertiesPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [data, setData] = useState<PropertiesData>({
    properties: [],
    memberships: [],
    teamByProperty: {},
    adminOrgIds: new Set(),
  });
  const [dialog, setDialog] = useState<'none' | 'create' | 'edit' | 'archive' | 'team'>('none');
  const [form, setForm] = useState<PropertyFormState>(emptyForm);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [assignRole, setAssignRole] = useState(propertyRoles[0].value);
  const [assignUserId, setAssignUserId] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [memberships, properties] = await Promise.all([
        listMyMemberships(supabase),
        listProperties(supabase),
      ]);
      const adminOrgIds = new Set(
        memberships
          .filter((membership) => membership.role === 'agency_admin')
          .map((membership) => membership.organization_id),
      );
      let teamByProperty: Record<string, TeamMember[]> = {};
      if (properties.length > 0) {
        const { data: assignments } = await supabase
          .from('property_users')
          .select('property_id, user_id, role, status')
          .in('property_id', properties.map((property) => property.id));
        teamByProperty = {};
        for (const row of (assignments ?? []) as Array<{
          property_id: string;
          user_id: string;
          role: string;
          status: string;
        }>) {
          const existing = teamByProperty[row.property_id] ?? [];
          existing.push({
            user_id: row.user_id,
            role: row.role,
            full_name: null,
            status: row.status,
          });
          teamByProperty[row.property_id] = existing;
        }
      }
      setData({ properties, memberships, teamByProperty, adminOrgIds });
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

  if (!hasAuth) {
    return (
      <section aria-labelledby="properties-heading">
        <h1 id="properties-heading">Properties</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage properties."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="properties-heading">
        <h1 id="properties-heading">Properties</h1>
        <LoadingState label="Loading properties" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="properties-heading">
        <h1 id="properties-heading">Properties</h1>
        <ErrorState
          message="Properties could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  const isAdminOf = (organizationId: string) => data.adminOrgIds.has(organizationId);
  const manageableOrgs = data.memberships.filter((membership) =>
    membership.role === 'agency_admin',
  );

  function openCreate() {
    setForm({
      ...emptyForm,
      organizationId: manageableOrgs[0]?.organization_id ?? '',
    });
    setError(null);
    setDialog('create');
  }

  function openEdit(property: Property) {
    setForm({
      propertyId: property.id,
      organizationId: property.organization_id,
      name: property.name,
      island: property.island,
      atoll: property.atoll ?? '',
      phone: property.phone ?? '',
      email: property.email ?? '',
      address: property.address ?? '',
      status: property.status === 'archived' ? 'active' : property.status,
    });
    setError(null);
    setSelectedProperty(property);
    setDialog('edit');
  }

  function openArchive(property: Property) {
    setSelectedProperty(property);
    setDialog('archive');
  }

  async function openTeam(property: Property) {
    if (!supabase) {
      return;
    }
    setSelectedProperty(property);
    setTeamError(null);
    setTeamMembers([]);
    setOrgMembers([]);
    setAssignUserId('');
    setDialog('team');
    try {
      const [team, members] = await Promise.all([
        listPropertyTeam(supabase, property.id),
        isAdminOf(property.organization_id)
          ? listOrganizationMembers(supabase, property.organization_id)
          : Promise.resolve<OrganizationMember[]>([]),
      ]);
      setTeamMembers(team);
      setOrgMembers(members);
    } catch {
      setTeamError('The team could not be loaded.');
    }
  }

  async function handlePropertySubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await upsertProperty(supabase, {
        property_id: form.propertyId,
        organization_id: form.organizationId,
        name: form.name,
        island: form.island,
        atoll: form.atoll.trim().length > 0 ? form.atoll : null,
        phone: form.phone.trim().length > 0 ? form.phone : null,
        email: form.email.trim().length > 0 ? form.email : null,
        address: form.address.trim().length > 0 ? form.address : null,
        status: form.status,
      });
      setDialog('none');
      await reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!supabase || !selectedProperty) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await upsertProperty(supabase, {
        property_id: selectedProperty.id,
        organization_id: selectedProperty.organization_id,
        name: selectedProperty.name,
        island: selectedProperty.island,
        atoll: selectedProperty.atoll,
        phone: selectedProperty.phone,
        email: selectedProperty.email,
        address: null,
        status: 'archived',
      });
      setDialog('none');
      setSelectedProperty(null);
      await reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : null);
      setDialog('none');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !selectedProperty || assignUserId.length === 0) {
      return;
    }
    setSubmitting(true);
    setTeamError(null);
    try {
      await assignPropertyMember(supabase, selectedProperty.id, assignUserId, assignRole);
      const team = await listPropertyTeam(supabase, selectedProperty.id);
      setTeamMembers(team);
      setAssignUserId('');
    } catch (submitError) {
      setTeamError(submitError instanceof Error ? submitError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(member: TeamMember) {
    if (!supabase || !selectedProperty) {
      return;
    }
    setSubmitting(true);
    setTeamError(null);
    try {
      await revokePropertyMember(supabase, selectedProperty.id, member.user_id);
      const team = await listPropertyTeam(supabase, selectedProperty.id);
      setTeamMembers(team);
    } catch (submitError) {
      setTeamError(submitError instanceof Error ? submitError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  const propertyDialog = dialog === 'create' || dialog === 'edit';

  return (
    <section aria-labelledby="properties-heading">
      <div className="page-header">
        <div>
          <h1 id="properties-heading">Properties</h1>
          <p className="page-description">
            Guesthouse properties in your organizations. Organization
            admins create, edit, archive, and assign teams; other
            members get read-only access.
          </p>
        </div>
        {manageableOrgs.length > 0 && (
          <Button onClick={openCreate}>Add property</Button>
        )}
      </div>
      {data.properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          message="Create your first property to manage enquiries, conversations, tasks, and approvals in one place."
          action={
            manageableOrgs.length > 0 ? (
              <Button onClick={openCreate}>Add property</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="property-grid">
          {data.properties.map((property) => {
            const teamCount = (data.teamByProperty[property.id] ?? []).length;
            const admin = isAdminOf(property.organization_id);
            const archived = property.status === 'archived';
            return (
              <article key={property.id} className="property-card">
                <header className="property-card-header">
                  <span className="property-card-icon">
                    <Icon>
                      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
                      <path d="M15 9h4a1 1 0 0 1 1 1v11" />
                      <path d="M3 21h18" />
                      <path d="M9 7h2" />
                      <path d="M9 11h2" />
                      <path d="M9 15h2" />
                    </Icon>
                  </span>
                  <div className="property-card-title">
                    <h2>{property.name}</h2>
                    <p className="property-card-location">
                      {property.island}
                      {property.atoll ? `, ${property.atoll}` : ''}
                    </p>
                  </div>
                  <Badge status={property.status} tone={statusTone(property.status)} />
                </header>
                <dl className="property-card-meta">
                  {data.memberships.length > 1 && (
                    <div>
                      <dt>Organization</dt>
                      <dd>{property.organization?.name ?? '—'}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Team</dt>
                    <dd>
                      {teamCount} {teamCount === 1 ? 'member' : 'members'}
                    </dd>
                  </div>
                </dl>
                <footer className="property-card-actions">
                  {admin && !archived ? (
                    <>
                      <Button variant="outline" onClick={() => openEdit(property)}>
                        Edit
                      </Button>
                      <Button variant="outline" onClick={() => void openTeam(property)}>
                        Team
                      </Button>
                      <Button variant="ghost" onClick={() => openArchive(property)}>
                        Archive
                      </Button>
                    </>
                  ) : archived ? (
                    <span className="table-secondary">Archived</span>
                  ) : (
                    <span className="table-secondary">Read only</span>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <Dialog
        open={propertyDialog}
        title={dialog === 'create' ? 'Add property' : 'Edit property'}
        onClose={() => setDialog('none')}
      >
        <form onSubmit={handlePropertySubmit} noValidate>
          {dialog === 'create' && (
            <SelectField
              label="Organization"
              value={form.organizationId}
              onChange={(event) =>
                setForm({ ...form, organizationId: event.target.value })
              }
              required
            >
              {manageableOrgs.map((membership) => (
                <option
                  key={membership.organization_id}
                  value={membership.organization_id}
                >
                  {membership.organization?.name ?? membership.organization_id}
                </option>
              ))}
            </SelectField>
          )}
          <Field
            label="Property name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <Field
            label="Island"
            value={form.island}
            onChange={(event) => setForm({ ...form, island: event.target.value })}
            required
          />
          <Field
            label="Atoll"
            optional
            value={form.atoll}
            onChange={(event) => setForm({ ...form, atoll: event.target.value })}
          />
          <Field
            label="Phone"
            optional
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <Field
            label="Email"
            optional
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <Field
            label="Address"
            optional
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
          {dialog === 'edit' && (
            <SelectField
              label="Status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              helper="Archived properties are hidden from new scans and enquiries."
              required
            >
              {propertyStatuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setDialog('none')}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {dialog === 'create' ? 'Create property' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={dialog === 'archive'}
        title="Archive property"
        onClose={() => setDialog('none')}
        describedBy="archive-confirm-description"
      >
        <p id="archive-confirm-description">
          Archive {selectedProperty?.name}? Archived properties keep their
          history but are marked inactive. You can edit the property later to
          restore an active status.
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setDialog('none')}>
            Cancel
          </Button>
          <Button variant="destructive" loading={submitting} onClick={() => void handleArchive()}>
            Archive property
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={dialog === 'team'}
        title={`Team: ${selectedProperty?.name ?? ''}`}
        onClose={() => setDialog('none')}
      >
        {teamError && (
          <p className="auth-error" role="alert">
            {teamError}
          </p>
        )}
        {teamMembers.length === 0 ? (
          <p>No team members are assigned to this property yet.</p>
        ) : (
          <ul className="team-list">
            {teamMembers.map((member) => (
              <li key={member.user_id} className="team-list-item">
                <div>
                  <p className="table-primary">
                    {member.full_name ?? member.user_id}
                  </p>
                  <p className="table-secondary">
                    {member.role.replace(/_/g, ' ')} ({member.status})
                  </p>
                </div>
                {isAdminOf(selectedProperty?.organization_id ?? '') && (
                  <Button
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => void handleRevoke(member)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {isAdminOf(selectedProperty?.organization_id ?? '') && (
          <form onSubmit={handleAssign} noValidate>
            <h3>Assign a member</h3>
            <SelectField
              label="Organization member"
              value={assignUserId}
              onChange={(event) => setAssignUserId(event.target.value)}
              required
            >
              <option value="">Choose a member…</option>
              {orgMembers
                .filter(
                  (member) =>
                    !teamMembers.some(
                      (existing) =>
                        existing.user_id === member.user_id &&
                        existing.status === 'active',
                    ),
                )
                .map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name ?? member.email} ({member.role.replace(/_/g, ' ')})
                  </option>
                ))}
            </SelectField>
            <SelectField
              label="Role"
              value={assignRole}
              onChange={(event) => setAssignRole(event.target.value)}
              required
            >
              {propertyRoles.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <div className="dialog-actions">
              <Button type="submit" loading={submitting} disabled={assignUserId.length === 0}>
                Assign member
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}
