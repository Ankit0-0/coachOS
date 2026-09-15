/**
 * The heaviest body weight, in kg, the API accepts — for a weigh-in and for a
 * client's self-reported profile weight alike, so the two can't drift apart.
 * The client app mirrors it (mobile/clients/src/lib/weight.ts) to say so before
 * a request is ever sent.
 */
export const MAX_WEIGHT_KG = 150;
