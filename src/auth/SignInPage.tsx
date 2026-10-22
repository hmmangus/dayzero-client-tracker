import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';
import { Field } from '../components/Field';
import { ThemeToggle } from '../components/ThemeToggle';
import { buttonClass, cardClass, inputClass } from '../components/ui';
import { useAuth } from './AuthContext';

const emailSchema = z.email('Enter a valid email address.');

/** Only allow redirects within this app. */
const safeNext = (value: string | null, fallback: string) => (value && value.startsWith('/') && !value.startsWith('//') ? value : fallback);

export function SignInPage() {
  const [params] = useSearchParams();
  const as = params.get('as') === 'coach' ? 'coach' : 'client';
  const next = safeNext(params.get('next'), as === 'coach' ? '/coach' : '/me');
  const { state } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (state.status === 'signed-in' && state.role !== 'unlinked') return <Navigate to={state.role === 'coach' ? '/coach' : '/me'} replace />;

  const sendLink = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email.trim().toLowerCase());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: sendError } = await getSupabase().auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (sendError) {
      setError(
        sendError.status === 429
          ? 'Too many sign-in emails were sent recently. Please wait a few minutes and try again.'
          : "We couldn't send the email. Check the address and try again.",
      );
      return;
    }
    setSentTo(parsed.data);
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await getSupabase().auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' });
    setBusy(false);
    if (verifyError) {
      setError('That code didn’t work. Check it, or use the link in the email instead.');
      return;
    }
    navigate(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">D0</span>
            <span className="font-semibold">Dayzero</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className={`${cardClass} p-6`}>
          <h1 className="text-xl font-semibold">{as === 'coach' ? 'Coach sign in' : 'Client sign in'}</h1>

          {!sentTo ? (
            <form onSubmit={sendLink} noValidate className="mt-4 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Enter your email and we'll send you a sign-in link. No password needed.
              </p>
              <Field label="Email" error={error ?? undefined}>
                {(a11y) => (
                  <input {...a11y} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                )}
              </Field>
              <button type="submit" className={buttonClass('primary', 'w-full')} disabled={busy}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
              {as === 'client' && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your logs and check-ins are shared only with your coach and stored securely online. Ask your coach if you'd like your data removed.
                </p>
              )}
            </form>
          ) : (
            <div className="mt-4 space-y-4">
              <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
                Check your inbox at <strong>{sentTo}</strong> and tap the link to sign in. It can take a minute, so check spam too.
              </p>
              <form onSubmit={verifyCode} noValidate className="space-y-3">
                <Field label="Or enter the code from the email" error={error ?? undefined}>
                  {(a11y) => (
                    <input
                      {...a11y}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className={`${inputClass} tracking-widest`}
                    />
                  )}
                </Field>
                <button type="submit" className={buttonClass('secondary', 'w-full')} disabled={busy || code.trim().length < 6}>
                  Sign in with code
                </button>
              </form>
              <button type="button" className="text-sm text-slate-500 underline" onClick={() => setSentTo(null)}>
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
