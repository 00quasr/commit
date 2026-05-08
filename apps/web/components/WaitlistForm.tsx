"use client";

import { api } from "@commit/convex/api";
import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "ok" | "duplicate" | "invalid" | "error";

type WaitlistFormProps = {
  source?: "hero" | "closing";
  className?: string;
};

export function WaitlistForm({ source, className = "" }: WaitlistFormProps) {
  const add = useMutation(api.waitlist.add);
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await add({
        email,
        source,
        honeypot,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 256) : undefined,
      });
      setStatus(res.status === "ok" ? "ok" : res.status);
      if (res.status === "ok") setEmail("");
    } catch {
      setStatus("error");
    }
  }

  const message = (() => {
    switch (status) {
      case "ok":
        return "You're on the list. Watch for an invite.";
      case "duplicate":
        return "Already on it — sit tight.";
      case "invalid":
        return "That doesn't look like an email.";
      case "error":
        return "Something broke. Try again in a moment.";
      default:
        return null;
    }
  })();

  const messageTone =
    status === "ok" || status === "duplicate" ? "text-text-secondary" : "text-text-tertiary";

  return (
    <form
      onSubmit={onSubmit}
      className={`flex w-full max-w-md flex-col gap-2 ${className}`}
      noValidate
    >
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="waitlist-email">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@domain.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 flex-1 rounded-full border border-hairline bg-block-elevated px-5 text-sm text-text-primary placeholder:text-text-muted outline-none transition focus:border-white/30"
        />
        {/* Honeypot — visually hidden, keep tabbable=false. */}
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-11 rounded-full bg-text-primary px-6 text-sm font-medium text-bg transition hover:bg-white/90 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Get the beta"}
        </button>
      </div>
      {message && (
        <div className={`px-2 font-mono text-[11px] ${messageTone}`} role="status">
          {message}
        </div>
      )}
    </form>
  );
}
