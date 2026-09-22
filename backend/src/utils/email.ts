export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The domain of an address, for log lines that need to say where something came
 * from without recording who. Returns "unknown" for anything unparseable.
 */
export function emailDomain(email: string): string {
  const domain = normalizeEmail(email).split("@")[1];
  return domain && domain.length > 0 ? domain : "unknown";
}
