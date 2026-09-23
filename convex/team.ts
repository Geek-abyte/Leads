export function teamEmails(): string[] {
  const raw =
    (process.env as Record<string, string | undefined>).TEAM_EMAILS ?? "";
  return raw
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isTeamEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = teamEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}
