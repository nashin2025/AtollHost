import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { paths } from '../router';
import { Sidebar } from './ui/Sidebar';
import { TopHeader } from './ui/TopHeader';
import { PageContainer } from './ui/PageContainer';
import { Avatar } from './ui/Avatar';
import { Menu, MenuTrigger, MenuItem, MenuSeparator } from './ui/Menu';

const navItems = [
  { to: paths.overview, label: 'Overview', icon: HomeIcon },
  { to: paths.properties, label: 'Properties', icon: BuildingIcon },
  { to: paths.scanner, label: 'Scanner', icon: SearchIcon },
  { to: paths.enquiries, label: 'Enquiries', icon: MailIcon },
  { to: paths.inbox, label: 'Inbox', icon: InboxIcon },
  { to: paths.guests, label: 'Guests', icon: UsersIcon },
  { to: paths.reservations, label: 'Reservations', icon: CalendarIcon },
  { to: paths.brain, label: 'Property Brain', icon: BrainIcon },
  { to: paths.tasks, label: 'Tasks', icon: CheckSquareIcon },
  { to: paths.journey, label: 'Guest Journey', icon: MapIcon },
  { to: paths.reviews, label: 'Reviews', icon: StarIcon },
  { to: paths.content, label: 'Content', icon: FileTextIcon },
  { to: paths.reports, label: 'Reports', icon: BarChartIcon },
  { to: paths.automations, label: 'Automations', icon: ZapIcon },
  { to: paths.integrations, label: 'Integrations', icon: PuzzleIcon },
  { to: paths.team, label: 'Team & Access', icon: ShieldIcon },
  { to: paths.settings, label: 'Settings', icon: SettingsIcon },
];

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 22V12h2v10" strokeLinecap="round" /></svg>;
}
function BuildingIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="14" height="16" rx="1" /><path d="M3 10h14M3 14h14M3 18h14" strokeLinecap="round" /></svg>;
}
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7" /><path d="M15 15l4 4" strokeLinecap="round" /></svg>;
}
function MailIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="16" height="12" rx="1" /><path d="M2 5l8 7 8-7" strokeLinecap="round" /></svg>;
}
function InboxIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M4 8h16" strokeLinecap="round" /></svg>;
}
function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3Z" /><path d="M4 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3Z" /><path d="M10 19c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8Z" /></svg>;
}
function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="14" height="14" rx="2" /><path d="M3 10h14M8 4v4M12 4v4" strokeLinecap="round" /></svg>;
}
function BrainIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2c-2.5 0-4.5 1-4.5 2.5S7 7 8.5 7 10.5 6 10.5 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 14c0-2.5 1.5-4.5 3.5-5.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 14c0-2.5-1.5-4.5-3.5-5.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 18c2-1 4-1 6 0" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CheckSquareIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M7 10l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function MapIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2L3 7v10l7 5 7-5V2Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 7v10" strokeLinecap="round" /></svg>;
}
function StarIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2l1.5 5h5l-4 3 1.5 5L10 14l-4.5 3 1.5-5H3l1.5-5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function FileTextIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M14 2v6h6" strokeLinecap="round" /><path d="M8 10h8M8 14h5" strokeLinecap="round" /></svg>;
}
function BarChartIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 18v-8M10 18v-12M16 18v-4" strokeLinecap="round" /></svg>;
}
function ZapIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L8 10l3 3-4 8 5-3 3 3L17 10Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PuzzleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 3h6v6H7V3Zm6 0h6v6h-6V3Zm0 6h6v6h-6V9Zm-6 6h6v6H7v-6Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ShieldIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2a5 5 0 0 1 5 5v8c0 2.5-2 4.5-5 5s-5-2.5-5-5V10a5 5 0 0 1 5-5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function SettingsIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="3" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.5 1.5M14 14l1.5 1.5M4.5 15.5l1.5-1.5M14 6l1.5-1.5" strokeLinecap="round" /></svg>;
}

function NavItem({ to, label, Icon, isActive }: { to: string; label: string; Icon: React.ComponentType<{ className?: string }>; isActive: boolean }) {
  return (
    <li className="af-nav-item">
      <NavLink
        to={to}
        end={to === paths.overview}
        className={`af-nav-link${isActive ? ' af-nav-link--active' : ''}`}
      >
        <span className="af-nav-link-icon" aria-hidden="true">
          <Icon className="af-nav-link-icon-svg" />
        </span>
        <span className="af-nav-link-text">{label}</span>
      </NavLink>
    </li>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="af-sidebar__section-label">{label}</span>
      <ul className="af-nav-list" role="list">
        {children}
      </ul>
    </>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const current = navItems.find((item) => item.to === location.pathname);

  // Breadcrumbs
  const breadcrumbs = [];
  if (current && current.to !== paths.overview) {
    breadcrumbs.push({ label: 'Overview', href: paths.overview });
    breadcrumbs.push({ label: current.label, current: true });
  }

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUserEmail(data.user?.email ?? null);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen && !userMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen, userMenuOpen]);

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    navigate(paths.signIn);
  };

  return (
    <div className="af-shell">
      <a href="#main" className="skip-link">Skip to main content</a>

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        aria-label="Primary navigation"
        brand={<span className="af-sidebar__brand-text">AtollHost</span>}
        className={`${mobileNavOpen ? ' af-sidebar--open' : ''}`}
      >
        <NavSection label="Workspace">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              Icon={item.icon}
              isActive={current?.to === item.to}
            />
          ))}
        </NavSection>
      </Sidebar>

      <div className="af-shell-main">
        {mobileNavOpen && (
          <div
            className="af-mobile-overlay"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <TopHeader
          title={current?.label ?? 'AtollHost'}
          breadcrumbs={breadcrumbs.length > 0 ? breadcrumbs : undefined}
          mobileMenuOpen={mobileNavOpen}
          onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
          userMenu={
            <Menu>
              <MenuTrigger asChild>
                <button type="button" className="af-topbar__user-trigger" aria-label="User menu">
                  <Avatar name={userEmail ?? 'User'} size="sm" />
                </button>
              </MenuTrigger>
              <Menu>
                <p className="af-menu__header">{userEmail ?? 'Signed in user'}</p>
                <MenuSeparator />
                <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
              </Menu>
            </Menu>
          }
        />

        <PageContainer>
          <Outlet />
        </PageContainer>
      </div>
    </div>
  );
}