import { useState, type FormEvent } from 'react';
import { checkInInputSchema, type CheckIn } from '../../schemas';
import { useRepository } from '../../repositories';
import { addDaysIso } from '../../lib/dates';
import { formatDay } from '../../lib/format';
import { issuesToFieldErrors, type FieldErrors } from '../../lib/forms';
import { Field } from '../../components/Field';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/States';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass, inputClass } from '../../components/ui';
import { CheckInCard } from '../checkins/CheckInCard';
import { RatingPicker } from '../checkins/RatingPicker';
import { ReplyForm } from '../checkins/ReplyForm';

export function CheckInSection({ clientId, checkIns, today }: { clientId: string; checkIns: CheckIn[]; today: string }) {
  return (
    <section aria-labelledby="checkins-heading" className="grid gap-4 lg:grid-cols-5">
      <div className={`${cardClass} p-4 lg:col-span-2`}>
        <h2 id="checkins-heading" className="mb-1 font-semibold text-slate-900 dark:text-white">
          Record a check-in
        </h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">For check-ins done in person or by message. Clients can also send their own from the portal.</p>
        <CheckInForm clientId={clientId} today={today} />
      </div>
      <div className="lg:col-span-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">History</h3>
        <CheckInHistory checkIns={checkIns} today={today} />
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
      setErrors(issuesToFieldErrors(result.error.issues));
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

      <RatingPicker
        name="adherence"
        legend="Adherence (1 = poor, 5 = excellent)"
        value={rating}
        onChange={setRating}
        error={errors.adherenceRating}
      />

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

function CheckInHistory({ checkIns, today }: { checkIns: CheckIn[]; today: string }) {
  const repository = useRepository();
  const notify = useToast();
  const [toDelete, setToDelete] = useState<CheckIn | null>(null);

  if (checkIns.length === 0) {
    return <EmptyState title="No check-ins yet" description="Check-ins your client sends, and ones you record, appear here." />;
  }

  return (
    <>
      <ol className="space-y-3">
        {checkIns.map((checkIn) => (
          <li key={checkIn.id}>
            <CheckInCard
              checkIn={checkIn}
              viewer="coach"
              actions={
                <button
                  type="button"
                  className="rounded px-1.5 text-xs text-slate-400 hover:text-red-600"
                  onClick={() => setToDelete(checkIn)}
                  aria-label={`Delete check-in from ${formatDay(checkIn.date)}`}
                >
                  Delete
                </button>
              }
            >
              {checkIn.status === 'awaiting_coach' && <ReplyForm checkIn={checkIn} today={today} />}
            </CheckInCard>
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
