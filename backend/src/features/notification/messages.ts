import type { Notification } from "./service.js";

/*
  Every push the backend sends, worded in one place. Short enough for a lock
  screen, first names only, and never anything sensitive (weights, goals,
  messages) — a notification shows on a locked phone.
*/

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Client app: a coach invited them. */
export function inviteReceived(coachName: string): Notification {
  return { title: "New coach invite", body: `${firstName(coachName)} invited you to train with them on CoachOS.`, url: "/" };
}

/** Coach app: a client accepted or declined an invite. */
export function inviteAnswered(clientName: string, accepted: boolean, clientId: string | null): Notification {
  return accepted
    ? {
        title: "Invite accepted",
        body: `${firstName(clientName)} accepted your invite. Assign them a plan to get started.`,
        url: clientId ? `/clients/${clientId}` : "/",
      }
    : { title: "Invite declined", body: `${firstName(clientName)} declined your invite.`, url: "/" };
}

/** Coach app: a client asked to be coached from Explore. */
export function coachRequestReceived(clientName: string): Notification {
  return { title: "New client request", body: `${firstName(clientName)} would like you to coach them.`, url: "/" };
}

/** Client app: the coach answered their request. */
export function coachRequestAnswered(coachName: string, accepted: boolean): Notification {
  return accepted
    ? { title: "Request accepted", body: `${firstName(coachName)} is now your coach.`, url: "/" }
    : { title: "Request declined", body: `${firstName(coachName)} can't take you on right now. Explore other coaches.`, url: "/explore-coaches" };
}

/** Client app: a new workout or diet plan. */
export function planAssigned(coachName: string, type: "WORKOUT" | "DIET", planTitle: string): Notification {
  const kind = type === "WORKOUT" ? "workout" : "diet";
  return { title: `New ${kind} plan`, body: `${firstName(coachName)} assigned you "${planTitle}".`, url: type === "WORKOUT" ? "/workout" : "/diet" };
}

/** Coach app: an admin reviewed their account. */
export function coachReviewed(approved: boolean): Notification {
  return approved
    ? { title: "You're approved", body: "Your coach account is ready. Invite your first client.", url: "/" }
    : { title: "Account not approved", body: "Your coach account wasn't approved. Open the app for details.", url: "/" };
}

/** Both apps: a subscription ends in a few days. */
export function subscriptionEndingForCoach(clientName: string, clientId: string, endDate: string): Notification {
  return {
    title: "Subscription ending soon",
    body: `${firstName(clientName)}'s subscription ends on ${endDate}. Time to talk about renewing.`,
    url: `/clients/${clientId}`,
  };
}

export function subscriptionEndingForClient(coachName: string, endDate: string): Notification {
  return {
    title: "Subscription ending soon",
    body: `Your coaching with ${firstName(coachName)} ends on ${endDate}. Talk to them about renewing.`,
    url: "/",
  };
}

/** Client app: their coach deleted their account, so their plans are gone. */
export function coachLeft(coachName: string): Notification {
  return {
    title: "Your coach left CoachOS",
    body: `${firstName(coachName)} closed their account. Find a new coach in Explore.`,
    url: "/explore-coaches",
  };
}
