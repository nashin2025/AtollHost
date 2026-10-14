import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState, ErrorState } from '../../components/ui/States';
import { listPropertyTeam, type TeamMember } from '../../lib/properties';
import { supabase } from '../../lib/supabase';
import { useOwnerContext } from './OwnerPortalPage';

export function OwnerTeamPage() {
  const { allowedPropertyIds } = useOwnerContext();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');

  const hasAuth = supabase !== null;

  const reload = useCallback(async () => {
    if (!supabase) return;
    setState('loading');
    try {
      const results = await Promise.all(
        allowedPropertyIds.map((pid) =>
          listPropertyTeam(supabase!, pid),
        ),
      );
      setTeam(results.flat());
      setState('ready');
    } catch {
      setState('error');
    }
  }, [allowedPropertyIds]);

  useEffect(() => {
    if (hasAuth) void reload();
  }, [hasAuth, reload]);

  if (!hasAuth) {
    return (
      <section aria-labelledby="team-heading">
        <h1 id="team-heading">Team & Access</h1>
        <EmptyState title="Authentication required" message="Sign in to view team members." />
      </section>
    );
  }

  if (state === 'loading') {
    return (
      <section aria-labelledby="team-heading">
        <h1 id="team-heading">Team & Access</h1>
        <LoadingState label="Loading team members" />
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section aria-labelledby="team-heading">
        <h1 id="team-heading">Team & Access</h1>
        <ErrorState message="Team members could not be loaded." onRetry={() => void reload()} />
      </section>
    );
  }

  if (team.length === 0) {
    return (
      <EmptyState
        title="No team members"
        message="No team members have been granted access to your properties."
      />
    );
  }

  return (
    <section aria-labelledby="team-heading">
      <header className="page-header">
        <h1 id="team-heading">Team & Access</h1>
        <p className="page-description">
          Team members with access to your properties.
        </p>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Granted</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.user_id}>
                <td>
                  <p className="table-primary">{member.full_name ?? member.user_id}</p>
                </td>
                <td>{member.role.replace(/_/g, ' ')}</td>
                <td>
                  <Badge
                    status={member.status}
                    tone={member.status === 'active' ? 'success' : 'neutral'}
                  />
                </td>
                <td>
                  {member.granted_at
                    ? new Date(member.granted_at).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}