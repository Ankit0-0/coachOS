import type { CurrentCoach } from '@/lib/api';

/** Shown before accepting an invite that would replace the client's current coach. */
export function inviteSwitchWarning(current: CurrentCoach): string {
  const plan = current.hasActivePlan ? ' and have an active plan' : '';
  return `You're currently with ${current.name}${plan}. Accepting this will end that and remove their access to your progress. Continue?`;
}

/** Shown before sending a request to a coach who would replace the current one if they accept. */
export function requestSwitchWarning(current: CurrentCoach, newCoachName: string): string {
  const plan = current.hasActivePlan ? ' and have an active plan' : '';
  return `You're currently with ${current.name}${plan}. If ${newCoachName} accepts your request, that will end and ${current.name} will lose access to your progress. Send the request?`;
}

/** An invite whose subscription period ran out before it was accepted (410). */
export function expiredInviteMessage(coachName: string | undefined): string {
  const who = coachName ?? 'your coach';
  return `This invite's subscription period has already ended, so it can't be accepted. Ask ${who} to send a new invite.`;
}
