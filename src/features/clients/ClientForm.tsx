import { useState, type FormEvent } from 'react';
import {
  GOALS,
  LEAD_SOURCES,
  PROGRAM_TIERS,
  STAGES,
  newClientSchema,
  type Client,
  type NewClient,
  type Stage,
} from '../../schemas';
import { GOAL_LABELS, LEAD_SOURCE_LABELS, STAGE_LABELS, TIER_LABELS } from '../../lib/labels';
import { issuesToFieldErrors, optionalString, requiredNumber, type FieldErrors } from '../../lib/forms';
import { Field } from '../../components/Field';
import { buttonClass, inputClass } from '../../components/ui';

type FormValues = Record<
  | 'name' | 'email' | 'phone' | 'leadSource' | 'programTier' | 'goal' | 'stage'
  | 'startDate' | 'nextCheckInDate' | 'notes'
  | 'calories' | 'proteinG' | 'carbsG' | 'fatG' | 'dailySteps' | 'goalWeightLbs',
  string
>;

const toFormValues = (client?: Client): FormValues => ({
  name: client?.name ?? '',
  email: client?.email ?? '',
  phone: client?.phone ?? '',
  leadSource: client?.leadSource ?? 'referral',
  programTier: client?.programTier ?? 'tier_1',
  goal: client?.goal ?? 'fat_loss',
  stage: client?.stage ?? 'lead',
  startDate: client?.startDate ?? '',
  nextCheckInDate: client?.nextCheckInDate ?? '',
  notes: client?.notes ?? '',
  calories: String(client?.targets.calories ?? 2000),
  proteinG: String(client?.targets.proteinG ?? 150),
  carbsG: String(client?.targets.carbsG ?? 200),
  fatG: String(client?.targets.fatG ?? 65),
  dailySteps: String(client?.targets.dailySteps ?? 8000),
  goalWeightLbs: client?.targets.goalWeightLbs !== undefined ? String(client.targets.goalWeightLbs) : '',
});

const fromFormValues = (v: FormValues): NewClient => ({
  name: v.name,
  email: optionalString(v.email),
  phone: optionalString(v.phone),
  leadSource: v.leadSource as NewClient['leadSource'],
  programTier: v.programTier as NewClient['programTier'],
  goal: v.goal as NewClient['goal'],
  stage: v.stage as Stage,
  startDate: optionalString(v.startDate),
  nextCheckInDate: optionalString(v.nextCheckInDate),
  notes: v.notes,
  targets: {
    calories: requiredNumber(v.calories),
    proteinG: requiredNumber(v.proteinG),
    carbsG: requiredNumber(v.carbsG),
    fatG: requiredNumber(v.fatG),
    dailySteps: requiredNumber(v.dailySteps),
    goalWeightLbs: requiredNumber(v.goalWeightLbs),
  },
});

interface ClientFormProps {
  client?: Client;
  /** Stage is only chosen when creating; existing clients move stage via the pipeline. */
  showStage?: boolean;
  submitLabel: string;
  onSubmit: (values: NewClient) => Promise<void>;
  onCancel?: () => void;
}

export function ClientForm({ client, showStage = false, submitLabel, onSubmit, onCancel }: ClientFormProps) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(client));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormValues) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = fromFormValues(values);
    const result = newClientSchema.safeParse(input);
    if (!result.success) {
      setErrors(issuesToFieldErrors(result.error.issues));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(input);
    } finally {
      setSaving(false);
    }
  };

  const text = (key: keyof FormValues, label: string, props: Record<string, unknown> = {}, errorKey: string = key) => (
    <Field label={label} error={errors[errorKey]}>
      {(a11y) => <input {...a11y} {...props} value={values[key]} onChange={set(key)} className={inputClass} />}
    </Field>
  );

  const number = (key: keyof FormValues, label: string, step = '1') =>
    text(key, label, { type: 'number', inputMode: step === '1' ? 'numeric' : 'decimal', min: 0, step }, `targets.${key}`);

  const select = <T extends string>(key: keyof FormValues, label: string, options: readonly T[], labels: Record<T, string>) => (
    <Field label={label} error={errors[key]}>
      {(a11y) => (
        <select {...a11y} value={values[key]} onChange={set(key)} className={inputClass}>
          {options.map((o) => (
            <option key={o} value={o}>
              {labels[o]}
            </option>
          ))}
        </select>
      )}
    </Field>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Profile</legend>
        {text('name', 'Name', { autoComplete: 'off', required: true })}
        {text('email', 'Email (optional)', { type: 'email', autoComplete: 'off' })}
        {text('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'off' })}
        {select('leadSource', 'Lead source', LEAD_SOURCES, LEAD_SOURCE_LABELS)}
        {select('programTier', 'Program tier', PROGRAM_TIERS, TIER_LABELS)}
        {select('goal', 'Goal', GOALS, GOAL_LABELS)}
        {showStage && select('stage', 'Stage', STAGES, STAGE_LABELS)}
        {text('startDate', 'Start date', { type: 'date' })}
        {text('nextCheckInDate', 'Next check-in', { type: 'date' })}
        <Field label="Notes" error={errors.notes} className="sm:col-span-2">
          {(a11y) => <textarea {...a11y} rows={3} value={values.notes} onChange={set('notes')} className={inputClass} />}
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Daily targets</legend>
        {number('calories', 'Calories')}
        {number('proteinG', 'Protein (g)')}
        {number('carbsG', 'Carbs (g)')}
        {number('fatG', 'Fat (g)')}
        {number('dailySteps', 'Steps')}
        {number('goalWeightLbs', 'Goal weight (lb)', '0.1')}
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className={buttonClass('primary')} disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={buttonClass('secondary')} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
