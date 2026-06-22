// components/ui/Field.tsx
"use client";

import React from "react";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: Readonly<{
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-stone-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-colors focus:border-stone-400 focus:ring-2 focus:ring-stone-100";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={`${inputClass} ${className}`} {...props} />
  )
);
Input.displayName = "Input";

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea ref={ref} className={`${inputClass} resize-y leading-relaxed ${className}`} {...props} />
  )
);
TextArea.displayName = "TextArea";

export function Select({
  className = "",
  children,
  ...props
}: Readonly<React.SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select className={`${inputClass} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  );
}