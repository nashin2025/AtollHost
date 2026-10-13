import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyState } from '../../components/ui/States';
import { ErrorState } from '../../components/ui/States';
import { LoadingState } from '../../components/ui/States';
import { Badge } from '../../components/ui/Badge';
import { Field } from '../../components/ui/Field';
import { SelectField } from '../../components/ui/Field';
import {
  inviteMember,
  listMyMemberships,
  revokeMember,
} from '../../lib/memberships';
import { listOrganizationMembers, type OrganizationMember } from '../../lib/properties';
import { paths } from '../../router';
import { supabase } from '../../lib/supabase';

const inviteRoles = [
  { value: 'agency_staff', label: 'Agency staff' },
  { value: 'agency_admin', label: 'Agency admin' },
  { value: 'property_owner', label: 'Property owner' },
  { value: 'property_manager', label: 'Property manager' },
  { value: 'property_staff', label: 'Property staff' },
];

const roleTone: Record<string, 'info' | 'neutral' | 'warning'> = {
  agency_admin: 'info',
  agency_staff: 'neutral',
  property_owner: 'warning',
  property_manager: 'warning',
  property_staff: 'neutral',
};

function invitationLink(token: string): string {
  return `${window.location.origin}${paths.acceptInvitation}?token=${encodeURIComponent(token)}`;
}

export function TeamPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [memberships, setMemberships] = useState<
    { organization_id: string; role: string; organization: { name: string } | null }[]
  >([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agency_staff');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<OrganizationMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [rows, userData] = await Promise.all([
        listMyMemberships(supabase),
        supabase.auth.getUser(),
      ]);
      setMemberships(rows);
      setCurrentUserId(userData.data.user?.id ?? '');
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

  const adminOrgs = memberships.filter((row) => row.role === 'agency_admin');

  useEffect(() => {
    if (status === 'ready' && selectedOrgId === '' && adminOrgs.length > 0) {
      setSelectedOrgId(adminOrgs[0].organization_id);
    }
  }, [status, selectedOrgId, adminOrgs]);

  const reloadMembers = useCallback(async () => {
    if (!supabase || selectedOrgId === '') {
      setMembers([]);
      return;
    }
    try {
      setMembers(await listOrganizationMembers(supabase, selectedOrgId));
    } catch {
      setMembers([]);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (status !== 'ready' || selectedOrgId === '') {
      return;
    }
    void reloadMembers();
  }, [status, selectedOrgId, reloadMembers]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="team-heading">
        <h1 id="team-heading">Team & Access</h1>
        <EmptyState
          title="Authentication required"
          message="Sign in to manage organization access."
        />
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <section aria-labelledby="team-heading">
        <h1 id="team-heading">Team & Access</h1>
        <LoadingState label="Loading access" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section aria-labelledby="team-heading">
        <h1 id="team-heading">Team & Access</h1>
        <ErrorState
          message="Access could not be loaded. Check your connection and try again."
          onRetry={() => void reload()}
        />
      </section>
    );
  }

  if (adminOrgs.length === 0) {
    return (
      <section aria-labelledby="team-heading">
        <h1 id="team-heading">Team & Access</h1>
        <EmptyState
          title="Admin access required"
          message="Organization admins manage members and invitations here. Ask an admin of your organization to grant you the agency admin role."
        />
      </section>
    );
  }

  const selectedOrg = adminOrgs.find((row) => row.organization_id === selectedOrgId) ?? null;

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await inviteMember(supabase, {
        organization_id: selectedOrgId,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteToken(result.token);
      await reloadMembers();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeConfirm() {
    if (!supabase || revoking === null) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await revokeMember(supabase, {
        organization_id: selectedOrgId,
        user_id: revoking.user_id,
      });
      setRevoking(null);
      await reloadMembers();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : null);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInvitationLink() {
    if (inviteToken === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(invitationLink(inviteToken));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function resetInvite() {
    setInviteOpen(false);
    setInviteToken(null);
    setInviteEmail('');
    setInviteRole('agency_staff');
    setCopied(false);
    setError(null);
  }

  const columns: Column<OrganizationMember>[] = [
    {
      key: 'member',
      header: 'Member',
      sortValue: (row) => row.full_name ?? row.email,
      render: (row) => (
        <div>
          <p className="table-primary">
            {row.full_name ?? 'Unnamed member'}
            {row.user_id === currentUserId && (
              <>
                {' '}
                <Badge status="you" tone="info" />
              </>
            )}
          </p>
          <p className="table-secondary">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (row) => row.role,
      render: (row) => (
        <Badge
          status={row.role.replace(/_/g, ' ')}
          tone={roleTone[row.role] ?? 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.user_id === currentUserId ? null : (
          <Button variant="outline" onClick={() => setRevoking(row)}>
            Revoke
          </Button>
        ),
    },
  ];

  return (
    <section aria-labelledby="team-heading">
      <div className="page-header">
        <div>
          <h1 id="team-heading">Team & Access</h1>
          <p className="page-description">
            Organization members and invitations. Admins invite members and
            revoke access; property-level assignments live on each property.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>Invite member</Button>
      </div>

      {adminOrgs.length > 1 && (
        <div className="field">
          <SelectField
            label="Organization"
            value={selectedOrgId}
            onChange={(event) => setSelectedOrgId(event.target.value)}
          >
            {adminOrgs.map((org) => (
              <option key={org.organization_id} value={org.organization_id}>
                {org.organization?.name ?? 'Organization'}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      {selectedOrg && (
        <p className="stat-context">
          {members.length} {members.length === 1 ? 'member' : 'members'} in{' '}
          {selectedOrg.organization?.name ?? 'this organization'}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={members}
        rowKey={(row) => row.user_id}
        emptyMessage="No members yet. Invite your first team member."
      />

      <Dialog
        open={inviteOpen}
        title="Invite member"
        onClose={resetInvite}
        describedBy="invite-dialog-description"
      >
        {inviteToken === null ? (
          <>
            <p id="invite-dialog-description">
              The invitation is single use and must be accepted by the email
              address it was sent to.
            </p>
            <form onSubmit={handleInvite} noValidate>
              <Field
                label="Email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
              <SelectField
                label="Role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
              >
                {inviteRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </SelectField>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <Button variant="secondary" onClick={resetInvite}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Create invitation
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="invite-result">
            <p>
              Invitation created for {inviteEmail}. Email delivery is not
              configured yet, so share this link with them directly:
            </p>
            <p className="invite-link">{invitationLink(inviteToken)}</p>
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => void copyInvitationLink()}>
                {copied ? 'Link copied' : 'Copy link'}
              </Button>
              <Button onClick={resetInvite}>Done</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={revoking !== null}
        title="Revoke access"
        onClose={() => setRevoking(null)}
        describedBy="revoke-dialog-description"
      >
        <p id="revoke-dialog-description">
          {revoking?.full_name ?? revoking?.email} will lose access to{' '}
          {selectedOrg?.organization?.name ?? 'this organization'} immediately.
          You can invite them again later.
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setRevoking(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={submitting}
            onClick={() => void handleRevokeConfirm()}
          >
            Revoke access
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
