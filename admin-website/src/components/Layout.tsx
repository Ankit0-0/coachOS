import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../lib/auth';

/** Shell for every signed-in page: a masthead, nav, and the routed content. */
export function Layout() {
  const { user, signOut } = useAuth();

  return (
    <>
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s5)' }}>
            <strong style={{ letterSpacing: '-0.01em' }}>Coach OS Admin</strong>
            <nav style={{ display: 'flex', gap: 'var(--s4)' }}>
              <NavLink to="/coaches" style={navLinkStyle}>
                Coaches
              </NavLink>
              <NavLink to="/plans" style={navLinkStyle}>
                Plans
              </NavLink>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {user?.email}
            </span>
            <button type="button" className="button buttonSmall buttonQuiet" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </>
  );
}

const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid var(--rule)',
};

const headerInnerStyle: React.CSSProperties = {
  maxWidth: 'var(--max-width)',
  margin: '0 auto',
  padding: 'var(--s3) var(--s4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--s4)',
};

function navLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    textDecoration: 'none',
    color: isActive ? 'var(--ink)' : 'var(--ink-muted)',
    fontWeight: isActive ? 600 : 400,
  };
}
