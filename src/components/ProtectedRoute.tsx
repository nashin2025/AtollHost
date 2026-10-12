import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from './ui/States';
import { supabase } from '../lib/supabase';
import { paths } from '../router';

export function ProtectedRoute(): ReactNode {
  const location = useLocation();
  const [session, setSession] = useState<unknown>(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, authSession) => {
        setSession(authSession);
      },
    );
    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return <LoadingState label="Checking sign-in status" />;
  }

  if (!session) {
    return <Navigate to={paths.signIn} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
