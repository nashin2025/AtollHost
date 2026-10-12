import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { paths } from '../../router';

export function AccessDeniedPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Access denied</h1>
        <p>
          You do not have permission to view this page. If you believe this is
          an error, ask your organization administrator for access.
        </p>
        <Link to={paths.overview}>
          <Button variant="secondary">Back to overview</Button>
        </Link>
      </div>
    </main>
  );
}
