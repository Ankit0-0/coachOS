import type { DirectoryCoach, ExploreRelationship } from '@/lib/api';

export function experienceLabel(years: number | null): string | null {
  if (years === null) return null;
  if (years === 0) return 'New coach';
  return `${years} ${years === 1 ? 'year' : 'years'} coaching`;
}

/**
 * The fewest clients worth putting on a card. A new coach's "0 clients" or
 * "1 client" reads as a warning rather than a fact, so below this the count is
 * left off entirely and the card leans on experience and specialties instead.
 */
export const MIN_CLIENTS_TO_SHOW = 3;

/**
 * "12 active clients", or "8 clients coached" for a coach whose current roster
 * is small but whose track record isn't — or null when neither is big enough to
 * say anything good.
 */
export function clientCountLabel(coach: Pick<DirectoryCoach, 'activeClientCount' | 'totalClientCount'>): string | null {
  if (coach.activeClientCount >= MIN_CLIENTS_TO_SHOW) return `${coach.activeClientCount} active clients`;
  if (coach.totalClientCount >= MIN_CLIENTS_TO_SHOW) return `${coach.totalClientCount} clients coached`;
  return null;
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
