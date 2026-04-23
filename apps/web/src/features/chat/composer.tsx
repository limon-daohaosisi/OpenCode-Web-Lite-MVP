import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

type ComposerProps = {
  defaultValue: string;
  disabled?: boolean;
  hint: string;
  isSubmitting?: boolean;
  onSubmit: (content: string) => void;
};

export function Composer({
  defaultValue,
  disabled = false,
  hint,
  isSubmitting = false,
  onSubmit
}: ComposerProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedValue = value.trim();

    if (!normalizedValue || disabled || isSubmitting) {
      return;
    }

    onSubmit(normalizedValue);
    setValue('');
  }

  return (
    <form
      className="mt-5 rounded-[24px] border border-sand bg-mist p-4"
      onSubmit={handleSubmit}
    >
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        补充要求
      </label>
      <textarea
        className="min-h-28 w-full resize-none rounded-2xl border border-white bg-white px-4 py-3 text-sm text-ink outline-none ring-0"
        disabled={disabled || isSubmitting}
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">{hint}</p>
        <button
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || isSubmitting || value.trim().length === 0}
          type="submit"
        >
          {isSubmitting ? '发送中...' : '发送给 agent'}
        </button>
      </div>
    </form>
  );
}
