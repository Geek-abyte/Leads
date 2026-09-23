import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">Ledger</div>
        <h1>{step === "signIn" ? "Sign in" : "Create your account"}</h1>
        <p className="hint">
          {step === "signIn"
            ? "Team members only — use the email you were invited with."
            : "Sign up with an email that's already on the team allowlist."}
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setBusy(true);
            const formData = new FormData(event.currentTarget);
            try {
              await signIn("password", formData);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Sign-in failed. Try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@team.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              name="password"
              type="password"
              autoComplete={
                step === "signIn" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          <input type="hidden" name="flow" value={step} />
          {error && <div className="auth-error">{error}</div>}
          <button className="primary auth-submit" disabled={busy} type="submit">
            {busy
              ? "Please wait…"
              : step === "signIn"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        <button
          className="ghost auth-switch"
          type="button"
          onClick={() => {
            setStep(step === "signIn" ? "signUp" : "signIn");
            setError("");
          }}
        >
          {step === "signIn"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
