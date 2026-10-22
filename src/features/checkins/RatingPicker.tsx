import { labelClass } from '../../components/ui';

/** 1–5 radio buttons styled as a segmented control. */
export function RatingPicker({
  name,
  legend,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  value: number | null;
  onChange: (value: number) => void;
  error?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className={labelClass}>{legend}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((option) => (
          <label key={option} className="flex-1">
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="peer sr-only" />
            <span className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-sm font-medium text-slate-700 peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-600 dark:border-slate-700 dark:text-slate-200">
              {option}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </fieldset>
  );
}
