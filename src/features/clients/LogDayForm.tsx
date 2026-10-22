import { useState, type FormEvent } from 'react';
import { progressLogInputSchema, type ProgressLog, type ProgressLogInput } from '../../schemas';
import { useRepository } from '../../repositories';
import { issuesToFieldErrors, optionalNumber, optionalString, type FieldErrors } from '../../lib/forms';
import { formatDayLong } from '../../lib/format';
import { Field } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { buttonClass, cardClass, inputClass } from '../../components/ui';

const NUMBER_FIELDS = [
  { key: 'weightLbs', label: 'Weight (lb)', decimal: true },
  { key: 'calories', label: 'Calories' },
  { key: 'proteinG', label: 'Protein (g)' },
  { key: 'carbsG', label: 'Carbs (g)' },
  { key: 'fatG', label: 'Fat (g)' },
  { key: 'steps', label: 'Steps' },
] as const;

type NumberKey = (typeof NUMBER_FIELDS)[number]['key'];

export function LogDayForm({ clientId, logs, today }: { clientId: string; logs: ProgressLog[]; today: string }) {
  const [date, setDate] = useState(today);
  const existing = logs.find((log) => log.date === date);

  return (
    <section className={`${cardClass} p-4`} aria-labelledby="log-day-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="log-day-heading" className="font-semibold text-slate-900 dark:text-white">
            {date === today ? 'Log today' : 'Log a day'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {existing ? 'Updating the existing entry. Blank fields keep their saved value.' : formatDayLong(date)}
          </p>
        </div>
        <label className="text-sm">
          <span className="sr-only">Date</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputClass} />
        </label>
      </div>
      {/* Re-mount when the date or saved entry changes so fields show that day's values. */}
      <LogDayFields key={`${date}:${JSON.stringify(existing ?? null)}`} clientId={clientId} date={date} existing={existing} />
    </section>
  );
}

function LogDayFields({ clientId, date, existing }: { clientId: string; date: string; existing?: ProgressLog }) {
  const repository = useRepository();
  const notify = useToast();
  const [values, setValues] = useState<Record<NumberKey | 'note', string>>(() => ({
    weightLbs: existing?.weightLbs?.toString() ?? '',
    calories: existing?.calories?.toString() ?? '',
    proteinG: existing?.proteinG?.toString() ?? '',
    carbsG: existing?.carbsG?.toString() ?? '',
    fatG: existing?.fatG?.toString() ?? '',
    steps: existing?.steps?.toString() ?? '',
    note: existing?.note ?? '',
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input: ProgressLogInput = {
      clientId,
      date,
      weightLbs: optionalNumber(values.weightLbs),
      calories: optionalNumber(values.calories),
      proteinG: optionalNumber(values.proteinG),
      carbsG: optionalNumber(values.carbsG),
      fatG: optionalNumber(values.fatG),
      steps: optionalNumber(values.steps),
      note: optionalString(values.note),
    };
    const result = progressLogInputSchema.safeParse(input);
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error.issues));
      return;
    }
    if (Object.entries(result.data).every(([key, value]) => key === 'clientId' || key === 'date' || value === undefined)) {
      setErrors({ form: 'Enter at least one value.' });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await repository.upsertProgressLog(result.data);
      notify('Log saved');
    } catch {
      notify("Couldn't save the log", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {NUMBER_FIELDS.map((field) => (
          <Field key={field.key} label={field.label} error={errors[field.key]}>
            {(a11y) => (
              <input
                {...a11y}
                type="number"
                min={0}
                step={'decimal' in field ? '0.1' : '1'}
                inputMode={'decimal' in field ? 'decimal' : 'numeric'}
                value={values[field.key]}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className={inputClass}
              />
            )}
          </Field>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Note (optional)" className="flex-1">
          {(a11y) => (
            <input {...a11y} value={values.note} onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))} className={inputClass} />
          )}
        </Field>
        <button type="submit" className={buttonClass('primary')} disabled={saving}>
          {saving ? 'Saving…' : existing ? 'Update log' : 'Save log'}
        </button>
      </div>
      {errors.form && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {errors.form}
        </p>
      )}
    </form>
  );
}
