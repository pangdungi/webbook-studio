"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function CopyField({ label, value, hint }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-lg bg-stone-50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-stone-500">{hint}</p>}
      <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-stone-800">
        {value}
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-1.5 text-xs font-medium text-stone-700 hover:underline"
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
