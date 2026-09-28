import type { Metadata } from 'next';

import { EmailLink, LegalList, LegalPage, LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of use — CoachOS',
  description: 'The rules for using the CoachOS apps.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="27 September 2026"
      intro={
        <p>
          These terms cover the CoachOS and CoachOS Coach apps and this website. By creating an account you agree to them
          and to our <a href="/privacy/" className="font-semibold text-terracotta-deep underline underline-offset-2">privacy policy</a>.
        </p>
      }
    >
      <LegalSection title="What CoachOS is">
        <p>
          CoachOS is a tool that helps fitness coaches share workout and diet plans with their clients and follow their
          progress. Coaches are independent: they are not employed by CoachOS, and we don’t check their
          qualifications beyond reviewing their account before they can take on clients.
        </p>
      </LegalSection>

      <LegalSection title="Not medical advice">
        <p>
          Nothing in CoachOS is medical advice. Talk to a doctor before starting a new exercise or diet programme,
          especially if you have a health condition, are pregnant, or are injured. Stop and seek help if anything feels
          wrong.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalList
          items={[
            'You must be at least 16 and give accurate details.',
            'Keep your password to yourself; you are responsible for what happens in your account.',
            'You can delete your account at any time in the app, under Profile → Delete account.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Coaches and clients">
        <p>
          The coaching arrangement, including any fee, is between the coach and the client. CoachOS does not take
          payments and is not a party to that arrangement. Subscription dates in the app are a record for the two of you.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <LegalList
          items={[
            'Don’t upload anything unlawful, hateful, sexually explicit, or that you don’t have the right to share.',
            'Don’t harass other people or misuse their information.',
            'Don’t try to break, overload, or get around the security of the service.',
          ]}
        />
        <p>We may suspend or remove accounts that break these rules.</p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You own what you put into CoachOS: plans, photos, comments. You let us store it and show it to the people it is
          shared with, only to run the service. Deleting your account deletes it.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p>
          We work to keep CoachOS running and your data safe, but the service is provided as it is, without guarantees
          that it will always be available or error-free. As far as the law allows, CoachOS is not liable for indirect
          losses, or for results of following a plan.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          We may update these terms; the date at the top shows when. If a change matters, we’ll tell you in the app
          first. Questions? Email <EmailLink subject="CoachOS terms" />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
