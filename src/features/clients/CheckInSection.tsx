import { useState, type FormEvent } from 'react';
import { checkInInputSchema, type CheckIn } from '../../schemas';
import { useRepository } from '../../repositories';
import { addDaysIso } from '../../lib/dates';
import { formatDay, formatDayLong } from '../../lib/format';
import { issuesToFieldErrors, type FieldErrors } from '../../lib/forms';
import { Field } from '../../components/Field';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/States';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass, inputClass, labelClass } from '../../components/ui';

export function CheckInSection({ clientId, checkIns, today }: { clientId: string; checkIns: CheckIn[]; today: string }) {
  return (
    <section aria-labelledby="checkins-heading" className="grid gap-4 lg:grid-cols-5">
      <div className={`${cardClass} p-4 lg:col-span-2`}>
        <h2 id="checkins-heading" className="mb-3 font-semibold text-slate-900 dark:text-white">
          New check-in
        </h2>
        <CheckInForm clientId={clientId} today={today} />
      </div>
      <div className="lg:col-span-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">History</h3>
        <CheckInHistory checkIns={checkIns} />
      </div>
    </section>
  );
}

function CheckInForm({ clientId, today }: { clientId: string; today: string }) {
  const repository = useRepository();
  const notify = useToast();
  const [date, setDate] = useState(today);
  const [rating, setRating] = useState<number | null>(null);
  const [coachNotes, setCoachNotes] = useState('');
  const [nextActions, setNextActions] = useState('');
  const [scheduleNext, setScheduleNext] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = checkInInputSchema.safeParse({ clientId, date, adherenceRating: rating ?? undefined, coachNotes, nextActions });
    if (!result.success) {
      const fieldErrors = issuesToFieldErrors(result.error.issues);
      if (fieldErrors.adherenceRating) fieldErrors.adherenceRating = 'Choose a rating from 1 to 5.';
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await repository.createCheckIn(result.data);
      if (scheduleNext) await repository.updateClient(clientId, { nextCheckInDate: addDaysIso(date, 7) });
      notify('Check-in saved');
      setRating(null);
      setCoachNotes('');
      setNextActions('');
    } catch {
      notify("Couldn't save the check-in", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Date" error={errors.date}>
        {(a11y) => <input {...a11y} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={inputClass} />}
      </Field>

      <fieldset aria-describedby={errors.adherenceRating ? 'rating-error' : undefined}>
        <legend className={labelClass}>Adherence (1 = poor, 5 = excellent)</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="flex-1">
              <input
                type="radio"
                name="adherence"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="peer sr-only"
              />
              <span className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-sm font-medium text-slate-700 peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-600 dark:border-slate-700 dark:text-slate-200">
                {value}
              </span>
            </label>
          ))}
        </div>
        {errors.adherenceRating && (
          <p id="rating-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {errors.adherenceRating}
          </p>
        )}
      </fieldset>

      <Field label="Coach notes">
        {(a11y) => <textarea {...a11y} rows={3} value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} className={inputClass} />}
      </Field>
      <Field label="Next actions">
        {(a11y) => <textarea {...a11y} rows={2} value={nextActions} onChange={(e) => setNextActions(e.target.value)} className={inputClass} />}
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={scheduleNext} onChange={(e) => setScheduleNext(e.target.checked)} className="h-4 w-4 accent-teal-700" />
        Schedule next check-in for {date ? formatDay(addDaysIso(date, 7)) : 'a week later'}
      </label>

      <button type="submit" className={buttonClass('primary', 'w-full sm:w-auto')} disabled={saving}>
        {saving ? 'Saving…' : 'Save check-in'}
      </button>
    </form>
  );
}

function CheckInHistory({ checkIns }: { checkIns: CheckIn[] }) {
  const repository = useRepository();
  const notify = useToast();
  const [toDelete, setToDelete] = useState<CheckIn | null>(null);

  if (checkIns.length === 0) {
    return <EmptyState title="No check-ins yet" description="Weekly check-ins will appear here." />;
  }

  return (
    <>
      <ol className="space-y-3">
        {checkIns.map((checkIn) => (
          <li key={checkIn.id} className={`${cardClass} p-4`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDayLong(checkIn.date)}</p>
              <div className="flex items-center gap-2">
                <AdherenceDots rating={checkIn.adherenceRating} />
                <button
                  type="button"
                  className="rounded px-1.5 text-xs text-slate-400 hover:text-red-600"
                  onClick={() => setToDelete(checkIn)}
                  aria-label={`Delete check-in from ${formatDay(checkIn.date)}`}
                >
                  Delete
                </button>
              </div>
            </div>
            {checkIn.coachNotes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{checkIn.coachNotes}</p>}
            {checkIn.nextActions && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-700 dark:text-slate-200">Next: </span>
                {checkIn.nextActions}
              </p>
            )}
          </li>
        ))}
      </ol>
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this check-in?"
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await repository.deleteCheckIn(toDelete.id);
          setToDelete(null);
          notify('Check-in deleted');
        }}
      />
    </>
  );
}

function AdherenceDots({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`Adherence ${rating} out of 5`} title={`Adherence ${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" className={`h-2 w-2 rounded-full ${i <= rating ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
      ))}
      <span aria-hidden="true" className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {rating}/5
      </span>
    </span>
  );
}
