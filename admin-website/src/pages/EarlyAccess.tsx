import { useCallback, useEffect, useState } from 'react';

import { adminEarlyAccessApi, type EarlyAccessList } from '../lib/api';

const PLATFORM_LABEL: Record<string, string> = { IOS: 'iOS', ANDROID: 'Android' };

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Everyone who asked to be told when CoachOS launches, newest first. */
export function EarlyAccess() {
  const [list, setList] = useState<EarlyAccessList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminEarlyAccessApi
      .list()
      .then((data) => {
        setList(data);
        setError(null);
      })
      .catch(() => setError('Could not load early access signups.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageHeaderText">
          <h1>Early access</h1>
          <p>Signups from the landing page. They are waiting to hear when the app is out on their phone.</p>
        </div>
        <button type="button" className="button" onClick={load} disabled={isLoading}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      {list ? (
        <div className="buttonRow" style={{ marginBottom: 'var(--s4)' }}>
          <span className="secondary">
            <strong>{list.total}</strong> total
          </span>
          <span className="secondary">
            <strong>{list.countsByPlatform.IOS}</strong> iOS
          </span>
          <span className="secondary">
            <strong>{list.countsByPlatform.ANDROID}</strong> Android
          </span>
        </div>
      ) : null}

      {isLoading && !list ? (
        <p className="muted">Loading…</p>
      ) : list && list.signups.length === 0 ? (
        <p className="empty">No one has signed up yet.</p>
      ) : list ? (
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Phone</th>
              <th>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {list.signups.map((signup) => (
              <tr key={signup.id}>
                <td>{signup.email}</td>
                <td className="secondary">{PLATFORM_LABEL[signup.platform] ?? signup.platform}</td>
                <td className="secondary numeric">{formatDateTime(signup.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
