'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { ModalShell, OptionText, optionCardClass, optionGridClass } from '@/components/modal-shell';
import {
  EarlyAccessError,
  isValidEmail,
  submitEarlyAccess,
  type Audience,
  type DevicePlatform,
} from '@/lib/early-access';

type EarlyAccessModalProps = {
  isOpen: boolean;
  /** Pre-selected by an audience-specific button; null from a neutral one. */
  initialAudience: Audience | null;
  onClose: () => void;
};

const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: 'COACH', label: "I'm a coach", hint: 'I manage clients' },
  { value: 'CLIENT', label: 'I train with a coach', hint: "Or I'm looking for one" },
];

const PLATFORMS: { value: DevicePlatform; label: string; hint: string }[] = [
  { value: 'ANDROID', label: 'Android', hint: 'Play Store' },
  { value: 'IOS', label: 'iPhone', hint: 'App Store' },
];

type FieldErrors = { audience?: string; email?: string; platform?: string };

export function EarlyAccessModal({ isOpen, initialAudience, onClose }: EarlyAccessModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const emailErrorId = useId();
  const audienceErrorId = useId();
  const platformErrorId = useId();

  const [audience, setAudience] = useState<Audience | null>(null);
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState<DevicePlatform | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // A fresh form each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    setAudience(initialAudience);
    setEmail('');
    setPlatform(null);
    setStatus('idle');
    setFieldErrors({});
    setSubmitError(null);
  }, [isOpen, initialAudience]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;

    // Checked here so a mistake is answered instantly, next to the field.
    const errors: FieldErrors = {};
    if (!audience) errors.audience = "Choose who it's for.";
    if (!isValidEmail(email)) errors.email = 'Enter an email address like name@example.com.';
    if (!platform) errors.platform = 'Choose Android or iPhone.';
    setFieldErrors(errors);
    setSubmitError(null);
    if (!audience || !platform || errors.email) {
      if (errors.email) emailInputRef.current?.focus();
      return;
    }

    setStatus('sending');
    try {
      await submitEarlyAccess({ email, platform, audience });
      setStatus('done');
    } catch (caught) {
      setStatus('idle');
      setSubmitError(caught instanceof EarlyAccessError ? caught.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} labelledBy={titleId} initialFocusRef={emailInputRef}>
      {status === 'done' ? (
        <SignupConfirmation
          audience={audience}
          platform={platform}
          titleId={titleId}
          reduceMotion={Boolean(prefersReducedMotion)}
          onClose={onClose}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p className="text-sm font-semibold text-terracotta-deep">Early access</p>
          <h2 id={titleId} className="mt-2 pr-10 font-display text-2xl font-bold text-forest sm:text-3xl">
            Be first to use CoachOS
          </h2>
          <p className="mt-2 text-base leading-7 text-muted">
            CoachOS isn&apos;t in the app stores yet. Tell us who you are and which phone you use, and
            we&apos;ll email you when it&apos;s ready.
          </p>

          <ChoiceGroup
            legend="Who is it for?"
            name="early-access-audience"
            options={AUDIENCES}
            value={audience}
            error={fieldErrors.audience}
            errorId={audienceErrorId}
            onChange={(value) => {
              setAudience(value);
              setFieldErrors((current) => ({ ...current, audience: undefined }));
            }}
          />

          <label htmlFor="early-access-email" className="mt-6 block text-sm font-semibold text-charcoal">
            Email address
          </label>
          <input
            id="early-access-email"
            ref={emailInputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="you@example.com"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? emailErrorId : undefined}
            className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-muted focus-visible:border-forest ${
              fieldErrors.email ? 'border-terracotta-deep' : 'border-forest/20'
            }`}
          />
          <FieldError id={emailErrorId}>{fieldErrors.email}</FieldError>

          <ChoiceGroup
            legend="Which phone do you use?"
            name="early-access-platform"
            options={PLATFORMS}
            value={platform}
            error={fieldErrors.platform}
            errorId={platformErrorId}
            onChange={(value) => {
              setPlatform(value);
              setFieldErrors((current) => ({ ...current, platform: undefined }));
            }}
          />

          {submitError ? (
            <p role="alert" className="mt-5 rounded-xl bg-terracotta-soft px-4 py-3 text-sm text-charcoal">
              {submitError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-6 py-3 text-base font-semibold text-cream transition hover:bg-forest-deep disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === 'sending' ? 'Joining…' : 'Join early access'}
          </button>
          <p className="mt-4 text-center text-sm text-muted">
            One email when the app is ready for your phone. No newsletters.
          </p>
        </form>
      )}
    </ModalShell>
  );
}

/** Two big radio cards under a legend. Native radios, so arrow keys work. */
function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  error,
  errorId,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string; hint: string }[];
  value: T | null;
  error: string | undefined;
  errorId: string;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mt-6" aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-semibold text-charcoal">{legend}</legend>
      <div className={`${optionGridClass} mt-2`}>
        {options.map((option) => (
          <label
            key={option.value}
            // The radio itself is hidden, so its focus ring goes on the card.
            className={`${optionCardClass(value === option.value)} has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-terracotta`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <OptionText
              label={option.label}
              hint={option.hint}
              marker={
                <span
                  aria-hidden="true"
                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    value === option.value ? 'border-forest' : 'border-muted'
                  }`}
                >
                  {value === option.value ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}
                </span>
              }
            />
          </label>
        ))}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-terracotta-deep">
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 4.5v4.2M8 11.2v.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {children}
    </p>
  );
}

/** What replaces the form once the signup is in: a tick, and what happens next. */
function SignupConfirmation({
  audience,
  platform,
  titleId,
  reduceMotion,
  onClose,
}: {
  audience: Audience | null;
  platform: DevicePlatform | null;
  titleId: string;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const phone = platform === 'IOS' ? 'iPhone' : 'Android';
  const app = audience === 'CLIENT' ? 'the client app' : 'the coach app';

  return (
    <div className="py-4 text-center" role="status">
      <motion.svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        className="mx-auto text-forest"
        aria-hidden="true"
        initial={reduceMotion ? undefined : 'hidden'}
        animate={reduceMotion ? undefined : 'shown'}
      >
        <circle cx="32" cy="32" r="31" className="fill-sage" />
        <motion.path
          d="M20 33.5l8 8 16-18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        />
      </motion.svg>

      <h2 id={titleId} className="mt-5 font-display text-2xl font-bold text-forest sm:text-3xl">
        You&apos;re on the list
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-muted">
        We&apos;ll email you when {app} is ready on {phone}. There&apos;s nothing else you need to do.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border-2 border-forest/15 px-6 py-2.5 text-sm font-semibold text-forest transition hover:border-forest/40"
      >
        Back to the page
      </button>
    </div>
  );
}
