import { useState, type FormEvent } from 'react';
import { checkInReplySchema, type CheckIn } from '../../schemas';
import { useRepository } from '../../repositories';
import { addDaysIso } from '../../lib/dates';
import { formatDay } from '../../lib/format';
import { issuesToFieldErrors, type FieldErrors } from '../../lib/forms';
import { Field } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { buttonClass, inputClass } from '../../components/ui';

/** The coach's reply to a check-in a client sent from the portal. */
export function ReplyForm({ checkIn, today }: { checkIn: CheckIn; today: string }) {
  const repository = useRepository();
  const notify = useToast();
  const [coachNotes, setCoachNotes] = useState('');
  const [nextActions, setNextActions] = useState('');
  const [scheduleNext, setScheduleNext] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const nextDate = addDaysIso(today, 7);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = checkInReplySchema.safeParse({ coachNotes, nextActions });
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error.issues));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await repository.replyToCheckIn(checkIn.id, result.data);
      if (scheduleNext) await repository.updateClient(checkIn.clientId, { nextCheckInDate: nextDate });
      notify('Reply sent');
    } catch {
      notify("Couldn't send the reply", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
      <Field label="Your reply" error={errors.coachNotes}>
        {(a11y) => <textarea {...a11y} rows={3} value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} className={inputClass} />}
      </Field>
      <Field label="Next actions (optional)">
        {(a11y) => <textarea {...a11y} rows={2} value={nextActions} onChange={(e) => setNextActions(e.target.value)} className={inputClass} />}
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={scheduleNext} onChange={(e) => setScheduleNext(e.target.checked)} className="h-4 w-4 accent-teal-700" />
        Schedule next check-in for {formatDay(nextDate)}
      </label>
      <button type="submit" className={buttonClass('primary')} disabled={saving}>
        {saving ? 'Sending…' : 'Send reply'}
      </button>
    </form>
  );
}
