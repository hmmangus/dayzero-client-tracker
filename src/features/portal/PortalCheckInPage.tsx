import { useState, type FormEvent } from 'react';
import { clientCheckInInputSchema } from '../../schemas';
import { usePortal } from '../../repositories';
import { useMyCheckIns, useToday } from '../../hooks';
import { issuesToFieldErrors, type FieldErrors } from '../../lib/forms';
import { Field } from '../../components/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass, inputClass } from '../../components/ui';
import { CheckInCard } from '../checkins/CheckInCard';
import { RatingPicker } from '../checkins/RatingPicker';

export function PortalCheckInPage() {
  const checkIns = useMyCheckIns();

  return (
    <div className="space-y-6">
      <section className={`${cardClass} p-4`} aria-labelledby="new-checkin-heading">
        <h1 id="new-checkin-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
          Weekly check-in
        </h1>
        <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">How did this week go? Your coach will reply here.</p>
        <ClientCheckInForm />
      </section>

      <section aria-labelledby="my-checkins-heading" className="space-y-3">
        <h2 id="my-checkins-heading" className="font-semibold text-slate-900 dark:text-white">
          Past check-ins
        </h2>
        {checkIns.status === 'loading' && <LoadingState />}
        {checkIns.status === 'error' && <ErrorState error={checkIns.error} onRetry={checkIns.refresh} />}
        {checkIns.status === 'success' &&
          (checkIns.data.length === 0 ? (
            <EmptyState title="No check-ins yet" description="Your first one will appear here after you send it." />
          ) : (
            <ol className="space-y-3">
              {checkIns.data.map((checkIn) => (
                <li key={checkIn.id}>
                  <CheckInCard checkIn={checkIn} viewer="client" />
                </li>
              ))}
            </ol>
          ))}
      </section>
    </div>
  );
}

function ClientCheckInForm() {
  const portal = usePortal();
  const notify = useToast();
  const today = useToday();
  const [rating, setRating] = useState<number | null>(null);
  const [wins, setWins] = useState('');
  const [struggles, setStruggles] = useState('');
  const [questions, setQuestions] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = clientCheckInInputSchema.safeParse({ date: today, adherenceRating: rating ?? undefined, wins, struggles, questions });
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error.issues));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await portal.submitCheckIn(result.data);
      notify('Check-in sent to your coach');
      setRating(null);
      setWins('');
      setStruggles('');
      setQuestions('');
    } catch {
      notify("Couldn't send your check-in. Please try again.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <RatingPicker
        name="self-rating"
        legend="How well did you stick to the plan? (1 = rough week, 5 = nailed it)"
        value={rating}
        onChange={setRating}
        error={errors.adherenceRating}
      />
      <Field label="Wins this week">
        {(a11y) => <textarea {...a11y} rows={2} value={wins} onChange={(e) => setWins(e.target.value)} className={inputClass} placeholder="e.g. hit my step goal 5 days" />}
      </Field>
      <Field label="What was hard?">
        {(a11y) => <textarea {...a11y} rows={2} value={struggles} onChange={(e) => setStruggles(e.target.value)} className={inputClass} />}
      </Field>
      <Field label="Questions for your coach (optional)">
        {(a11y) => <textarea {...a11y} rows={2} value={questions} onChange={(e) => setQuestions(e.target.value)} className={inputClass} />}
      </Field>
      <button type="submit" className={buttonClass('primary', 'w-full sm:w-auto')} disabled={saving}>
        {saving ? 'Sending…' : 'Send check-in'}
      </button>
    </form>
  );
}
