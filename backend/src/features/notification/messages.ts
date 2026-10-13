import type { Notification } from "./service.js";

/*
  Every push the backend sends, worded in one place. Short enough for a lock
  screen, first names only, and never anything sensitive (weights, goals,
  messages) — a notification shows on a locked phone.
*/

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Client app: their coach removed them from their roster. */
export function coachEndedCoaching(coachName: string): Notification {
  return {
    title: "Coaching ended",
    body: `${firstName(coachName)} ended your coaching on CoachFolio. Your history is still in the app.`,
    url: "/explore-coaches",
  };
}

/** Coach app: a client logged a day's workout or diet for the first time. */
export function clientLogged(clientName: string, clientId: string, type: "WORKOUT" | "DIET"): Notification {
  const kind = type === "WORKOUT" ? "workout" : "meals";
  return { title: `${firstName(clientName)} checked in`, body: `${firstName(clientName)} logged their ${kind}.`, url: `/clients/${clientId}` };
}

/** Coach app: a client left a comment on a set or a meal. Never quotes it: lock screens are public. */
export function clientCommented(clientName: string, clientId: string, type: "WORKOUT" | "DIET"): Notification {
  const kind = type === "WORKOUT" ? "workout" : "meal";
  return { title: "New comment", body: `${firstName(clientName)} left a comment on their ${kind}.`, url: `/clients/${clientId}` };
}

/** Coach app: a client says they've paid by UPI and wants it confirmed. */
export function paymentReported(clientName: string, clientId: string, amount: string): Notification {
  return {
    title: "Payment to confirm",
    body: `${firstName(clientName)} says they paid ${amount}. Check your UPI app and mark it paid.`,
    url: `/clients/${clientId}`,
  };
}

/** Client app: their coach confirmed the payment arrived. */
export function paymentConfirmed(coachName: string, amount: string): Notification {
  return { title: "Payment received", body: `${firstName(coachName)} confirmed your payment of ${amount}.`, url: "/my-coach" };
}

/** Client app: a period's fee is due today. */
export function paymentDue(coachName: string, amount: string): Notification {
  return { title: "Payment due", body: `${amount} is due to ${firstName(coachName)} for your coaching.`, url: "/my-coach" };
}

/** Client app: a period's fee is still unpaid a few days in. */
export function paymentOverdueForClient(coachName: string, amount: string): Notification {
  return { title: "Payment overdue", body: `Your ${amount} payment to ${firstName(coachName)} is overdue.`, url: "/my-coach" };
}

/** Coach app: a client's fee is still unpaid a few days in. */
export function paymentOverdueForCoach(clientName: string, clientId: string, amount: string): Notification {
  return {
    title: "Payment overdue",
    body: `${firstName(clientName)} hasn't paid ${amount} yet. A reminder went to them too.`,
    url: `/clients/${clientId}`,
  };
}

/** Client app: a coach invited them. */
export function inviteReceived(coachName: string): Notification {
  return { title: "New coach invite", body: `${firstName(coachName)} invited you to train with them on CoachFolio.`, url: "/" };
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
    title: "Your coach left CoachFolio",
    body: `${firstName(coachName)} closed their account. Find a new coach in Explore.`,
    url: "/explore-coaches",
  };
}
