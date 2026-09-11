import { useState, type FormEvent } from 'react';

import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'That email and password don’t match an account.';
    if (error.status === 403) return 'That account is not an administrator.';
    if (error.status === 0) return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await signIn(email.trim().toLowerCase(), password);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '0 auto', padding: 'var(--s6) var(--s4)' }}>
      <div style={{ marginBottom: 'var(--s5)' }}>
        <p className="label" style={{ marginBottom: 'var(--s2)' }}>
          Coach OS
        </p>
        <h1>Admin</h1>
        <p style={{ marginTop: 'var(--s2)' }}>Sign in with an administrator account.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {error ? (
          <div className="notice" role="alert">
            {error}
          </div>
        ) : null}

        <button type="submit" className="button buttonPrimary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
