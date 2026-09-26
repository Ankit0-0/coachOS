import type { Metadata } from 'next';

import { EmailLink, LegalList, LegalPage, LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Delete your account — CoachOS',
  description: 'How to delete your CoachOS or CoachOS Coach account and the data in it.',
};

/** The web link Google Play asks for: how to delete an account, with or without the app. */
export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete your account"
      updated="27 September 2026"
      intro={<p>You can delete your CoachOS or CoachOS Coach account and everything in it at any time.</p>}
    >
      <LegalSection title="In the app (quickest)">
        <LegalList
          items={[
            'Open CoachOS or CoachOS Coach and sign in.',
            <>
              Go to <strong>Profile</strong>, scroll to <strong>Privacy</strong>, and tap <strong>Delete account</strong>.
            </>,
            <>
              Tap <strong>Delete</strong> to confirm. Your account is deleted straight away and you are signed out.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Without the app">
        <p>
          Email <EmailLink subject="Delete my CoachOS account" /> from the address you signed up with, and say which app
          the account is in. We’ll confirm and delete it within 7 days.
        </p>
      </LegalSection>

      <LegalSection title="What is deleted">
        <LegalList
          items={[
            'Your account, sign-in details and profile, including your photo.',
            'Clients: your weigh-ins, progress and meal photos, check-ins, comments, invites and requests.',
            'Coaches: the plans you wrote and your clients’ plan assignments and check-ins under them. Your clients keep their own accounts.',
            'Your notification tokens and subscription records.',
          ]}
        />
        <p>
          Nothing is kept afterwards, except copies in our providers’ routine backups, which are overwritten after a
          limited time.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
