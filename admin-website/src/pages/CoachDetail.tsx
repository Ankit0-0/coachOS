import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { adminCoachApi, type CoachDetail as CoachDetailModel } from '../lib/api';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <span className={value ? undefined : 'muted'}>{value || 'Not set'}</span>
    </div>
  );
}

export function CoachDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<CoachDetailModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    adminCoachApi
      .get(id)
      .then((data) => {
        setCoach(data);
        setError(null);
      })
      .catch(() => setError('Could not load that coach.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const decide = async (decision: 'approve' | 'reject') => {
    try {
      setIsBusy(true);
      await (decision === 'approve' ? adminCoachApi.approve(id) : adminCoachApi.reject(id));
      load();
    } catch {
      setError(`Could not ${decision} that coach.`);
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="page">
        <div className="notice">{error ?? 'That coach could not be found.'}</div>
        <button type="button" className="button" onClick={() => navigate('/coaches')}>
          Back to coaches
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <button
        type="button"
        className="rowLink muted"
        style={{ marginBottom: 'var(--s3)' }}
        onClick={() => navigate('/coaches')}>
        ← Coaches
      </button>

      <div className="pageHeader">
        <div className="pageHeaderText">
          <h1>{coach.name}</h1>
          <p>
            {coach.email} · <span className="status">{coach.approvalStatus ?? '—'}</span> · joined{' '}
            {formatDate(coach.memberSince)}
          </p>
        </div>

        {coach.approvalStatus === 'PENDING' ? (
          <div className="buttonRow">
            <button type="button" className="button buttonPrimary" disabled={isBusy} onClick={() => decide('approve')}>
              Approve
            </button>
            <button type="button" className="button" disabled={isBusy} onClick={() => decide('reject')}>
              Reject
            </button>
          </div>
        ) : (
          <div className="buttonRow">
            <button
              type="button"
              className="button buttonQuiet"
              disabled={isBusy}
              onClick={() => decide(coach.approvalStatus === 'APPROVED' ? 'reject' : 'approve')}>
              {coach.approvalStatus === 'APPROVED' ? 'Revoke approval' : 'Approve'}
            </button>
          </div>
        )}
      </div>

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      <div className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s4)' }}>
        <Detail label="Phone" value={coach.phone} />
        <Detail
          label="Experience"
          value={coach.yearsExperience === null ? null : `${coach.yearsExperience} years`}
        />
        <Detail label="Specialties" value={coach.specialties.length > 0 ? coach.specialties.join(', ') : null} />
        <Detail label="Clients" value={String(coach.clientCount)} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Detail label="Bio" value={coach.bio} />
        </div>
      </div>

      <section className="section">
        <div className="sectionHeader">
          <h2>Client roster</h2>
          <span className="muted numeric">{coach.clients.length}</span>
        </div>

        {coach.clients.length === 0 ? (
          <p className="empty">This coach has no clients yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Client since</th>
              </tr>
            </thead>
            <tbody>
              {coach.clients.map((client) => (
                <tr key={client.inviteId}>
                  <td className={client.name ? undefined : 'muted'}>{client.name ?? 'Account removed'}</td>
                  <td className="secondary">{client.email}</td>
                  <td className="secondary numeric">{formatDate(client.since)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
