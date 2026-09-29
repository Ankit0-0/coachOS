import type { Page } from '../lib/api';

/** "26–50 of 143" with previous and next. Hidden when everything fits on one page. */
export function Pager({ total, page, pageSize, onPage }: Page & { onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize && page === 1) return null;

  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <div className="pager">
      <span className="muted numeric">
        {first}–{last} of {total}
      </span>
      <div className="buttonRow">
        <button type="button" className="button buttonSmall" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className="button buttonSmall" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
