import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { paths } from '../router';

const navItems = [
  { to: paths.overview, label: 'Overview' },
  { to: paths.properties, label: 'Properties' },
  { to: paths.scanner, label: 'Scanner' },
  { to: paths.enquiries, label: 'Enquiries' },
  { to: paths.inbox, label: 'Inbox' },
  { to: paths.brain, label: 'Property Brain' },
  { to: paths.tasks, label: 'Tasks' },
  { to: paths.journey, label: 'Guest Journey' },
  { to: paths.reviews, label: 'Reviews' },
  { to: paths.content, label: 'Content' },
  { to: paths.reports, label: 'Reports' },
  { to: paths.integrations, label: 'Integrations' },
  { to: paths.team, label: 'Team & Access' },
  { to: paths.settings, label: 'Settings' },
];

export function AppShell() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const location = useLocation();
  const current = navItems.find((item) => item.to === location.pathname);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setUserEmail(data.user?.email ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen && !userMenuOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen, userMenuOpen]);

  const navList = (
    <ul className="nav-list">
      {navItems.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === paths.overview}
            className={({ isActive }) =>
              `nav-link${isActive ? ' nav-link-active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <nav className="sidebar" aria-label="Primary">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">AtollHost</span>
        </div>
        <div className="sidebar-section">
          <span className="sidebar-label" id="org-label">
            Organization
          </span>
          <button type="button" className="org-switcher" aria-describedby="org-hint">
            <span className="org-name">Default organization</span>
          </button>
          <p id="org-hint" className="sidebar-hint">
            Organization switching is not configured yet.
          </p>
        </div>
        {navList}
        <div className="sidebar-footer">
          <NavLink
            to={paths.settings}
            className={({ isActive }) =>
              `nav-link${isActive ? ' nav-link-active' : ''}`
            }
          >
            Settings
          </NavLink>
          <span className="sidebar-hint">Help is not configured yet.</span>
        </div>
      </nav>
      <div className="shell-main">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon mobile-nav-toggle"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p className="topbar-title">{current?.label ?? 'AtollHost'}</p>
          <div className="topbar-actions">
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label="Notifications"
              title="Notifications are not configured yet"
              disabled
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path
                  d="M10 3a4 4 0 0 1 4 4v3l1.5 3h-11L6 10V7a4 4 0 0 1 4-4Zm0 14a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <div className="user-menu">
              <button
                type="button"
                className="user-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((value) => !value)}
              >
                <span className="user-avatar" aria-hidden="true">
                  A
                </span>
                <span className="sr-only">User menu</span>
              </button>
              {userMenuOpen && (
                <div className="user-menu-list" role="menu">
                  <p className="user-menu-email">
                    {userEmail ?? 'Signed in user'}
                  </p>
                  <button
                    type="button"
                    role="menuitem"
                    className="user-menu-item"
                    onClick={() => {
                      void supabase?.auth
                        .signOut()
                        .then(() => navigate(paths.signIn));
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {mobileNavOpen && (
          <div
            className="mobile-nav-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setMobileNavOpen(false);
              }
            }}
          >
            <nav
              id="mobile-nav"
              className="mobile-nav"
              aria-label="Primary"
            >
              <div className="sidebar-brand">
                <span className="brand-mark" aria-hidden="true" />
                <span className="brand-name">AtollHost</span>
              </div>
              {navList}
            </nav>
          </div>
        )}
        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
