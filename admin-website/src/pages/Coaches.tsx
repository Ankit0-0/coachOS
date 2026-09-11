import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminCoachApi, type ApprovalStatus, type CoachSummary } from '../lib/api';

const FILTERS: { label: string; value: ApprovalStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function Coaches() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    adminCoachApi
      .list(filter === 'ALL' ? undefined : filter)
      .then((rows) => {
        setCoaches(rows);
        setError(null);
      })
      .catch(() => setError('Could not load coaches.'))
      .finally(() => setIsLoading(false));
  }, [filter]);

  useEffect(load, [load]);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    try {
      setBusyId(id);
      setError(null);
      await (decision === 'approve' ? adminCoachApi.approve(id) : adminCoachApi.reject(id));
      load();
    } catch {
      setError(`Could not ${decision} that coach.`);
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = coaches.filter((coach) => coach.approvalStatus === 'PENDING').length;

  return (
    <div className="page">
      <div className="pageHeader">
        <div className="pageHeaderText">
          <h1>Coaches</h1>
          <p>
            {isLoading
              ? 'Loading…'
              : `${coaches.length} ${coaches.length === 1 ? 'coach' : 'coaches'}${
                  pendingCount > 0 ? ` · ${pendingCount} awaiting review` : ''
                }`}
          </p>
        </div>
      </div>

      <div className="tabs">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`tab${filter === option.value ? ' tabActive' : ''}`}
            onClick={() => setFilter(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="notice" role="alert">
          {error}
        </div>
      ) : null}

      {!isLoading && coaches.length === 0 ? (
        <p className="empty">No coaches match this filter.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Status</th>
              <th>Clients</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.id}>
                <td>
                  <button type="button" className="rowLink" onClick={() => navigate(`/coaches/${coach.id}`)}>
                    {coach.name}
                  </button>
                </td>
                <td className="secondary">{coach.email}</td>
                <td className="secondary numeric">{formatDate(coach.memberSince)}</td>
                <td>
                  <span className={`status${coach.approvalStatus === 'PENDING' ? ' statusPending' : ''}`}>
                    {coach.approvalStatus ?? '—'}
                  </span>
                </td>
                <td className="numeric">{coach.clientCount}</td>
                <td>
                  {coach.approvalStatus === 'PENDING' ? (
                    <div className="buttonRow" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="button buttonSmall buttonPrimary"
                        disabled={busyId === coach.id}
                        onClick={() => decide(coach.id, 'approve')}>
                        Approve
                      </button>
                      <button
                        type="button"
                        className="button buttonSmall"
                        disabled={busyId === coach.id}
                        onClick={() => decide(coach.id, 'reject')}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
