import type { ExploreRelationship } from '@/lib/api';

export function experienceLabel(years: number | null): string | null {
  if (years === null) return null;
  if (years === 0) return 'New coach';
  return `${years} ${years === 1 ? 'year' : 'years'} coaching`;
}

/** The status a card shows, or null when there's nothing between you yet. */
export function relationshipPill(relationship: ExploreRelationship): { label: string; tone: 'accent' | 'neutral' } | null {
  switch (relationship) {
    case 'COACHING':
      return { label: 'Your coach', tone: 'accent' };
    case 'INVITED':
      return { label: 'Invited you', tone: 'neutral' };
    case 'REQUESTED':
      return { label: 'Request sent', tone: 'neutral' };
    default:
      return null;
  }
}
