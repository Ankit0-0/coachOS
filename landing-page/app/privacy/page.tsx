import type { Metadata } from 'next';

import { EmailLink, LegalList, LegalPage, LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy policy — CoachOS',
  description: 'What CoachOS collects, why, who can see it, and how to delete it.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="27 September 2026"
      intro={
        <p>
          CoachOS is two apps: <strong>CoachOS</strong> for people being coached, and <strong>CoachOS Coach</strong> for
          fitness coaches. This page explains what we collect in them and on this website, why, who can see it, and how
          to delete it. We don’t sell your data, show ads, or track you across other apps and websites.
        </p>
      }
    >
      <LegalSection title="What we collect">
        <LegalList
          items={[
            <>
              <strong>Your account:</strong> name, email address, and a securely hashed password. If you sign in with
              Google or Apple, we receive your name, email address and an account identifier from them. Apple may give
              us a private relay address instead of your real one.
            </>,
            <>
              <strong>Your profile:</strong> what you choose to add, such as a phone number, profile photo, height,
              starting weight, goals and diet preference (clients), or a bio, specialties and years of experience
              (coaches).
            </>,
            <>
              <strong>Your coaching:</strong> workout and diet plans, the sets and meals you tick off, weigh-ins,
              progress and meal photos, comments you leave for your coach, invites, requests to a coach, and
              subscription dates.
            </>,
            <>
              <strong>Your device:</strong> a push notification token, so we can send notifications you’ve allowed,
              and your reminder choices, which stay on the phone.
            </>,
            <>
              <strong>Crash reports:</strong> when an app or our server fails, a report with technical details (device
              model, operating system, app version, the screen you were on). Passwords, tokens and request bodies are
              removed before a report is sent.
            </>,
            <>
              <strong>Early access list:</strong> if you join it on this website, your email address and phone type.
            </>,
          ]}
        />
        <p>
          Weight, photos and workout and diet logs are health and fitness information. We use them only to run CoachOS
          for you and the coach you choose to work with.
        </p>
      </LegalSection>

      <LegalSection title="Why we use it">
        <LegalList
          items={[
            'To run your account and sign you in.',
            'To show your plans and progress to you, and to the coach you are working with.',
            'To send the notifications you have allowed, such as a new invite, a new plan, or a subscription about to end.',
            'To send a password reset code when you ask for one.',
            'To find and fix errors, and to keep CoachOS secure (for example, limiting repeated sign-in attempts).',
          ]}
        />
      </LegalSection>

      <LegalSection title="Who can see it">
        <LegalList
          items={[
            <>
              <strong>Your coach</strong> sees your profile, plans, check-ins, comments, weigh-ins and photos while you
              are their client, and your phone number if you added one. You see your coach’s profile and phone
              number.
            </>,
            <>
              <strong>Clients browsing Explore</strong> see a coach’s public profile (name, photo, bio, specialties,
              experience) only if the coach chose to be listed.
            </>,
            <>
              <strong>CoachOS administrators</strong> review coach accounts before they can take on clients.
            </>,
            <>
              <strong>Service providers</strong> that run CoachOS for us and only process data on our instructions:
              hosting (Render), database hosting (Aiven), photo storage (Amazon Web Services), email (Resend), push
              notifications (Expo, through Apple and Google), sign-in (Google, Apple) and crash reporting (Sentry).
            </>,
          ]}
        />
        <p>We share data with others only if the law requires it.</p>
      </LegalSection>

      <LegalSection title="How long we keep it, and deleting it">
        <p>
          We keep your data while your account exists. You can delete your account at any time in the app: open{' '}
          <strong>Profile</strong>, then <strong>Delete account</strong>. That removes your account, profile, plans you
          wrote, check-ins, comments, weigh-ins, photos and notification tokens straight away. Copies may remain in our
          providers’ routine backups for a limited time until they are overwritten.
        </p>
        <p>
          If you can’t use the app, see <a href="/delete-account/" className="font-semibold text-terracotta-deep underline underline-offset-2">how to ask us to delete your account</a>.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <LegalList
          items={[
            'Edit your profile in the app at any time.',
            'Turn notifications and reminders off in the app or in your phone’s settings.',
            'Remove a photo, or delete your whole account.',
            <>
              Ask us for a copy of your data, or to correct or delete it, by emailing <EmailLink subject="My CoachOS data" />.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Data travels over encrypted connections. Passwords are stored only as salted hashes, photos are private and
          shared only through short-lived links, and sign-in attempts are rate limited. No system is perfectly secure, so
          please use a strong password.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>CoachOS is not meant for anyone under 16, and we don’t knowingly collect data from them.</p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          If we change this policy, we’ll update the date at the top, and tell you in the app if the change matters.
          Questions? Email <EmailLink subject="Privacy question" />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
