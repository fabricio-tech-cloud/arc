type FieldWatermarkProps = {
  label: string;
  className?: string;
};

/** Large faded right-side label, same language as overview cards (Sleep / Today). */
export function FieldWatermark({ label, className = "" }: FieldWatermarkProps) {
  return (
    <span
      className={`pointer-events-none absolute right-3 top-1/2 z-0 -translate-y-1/2 select-none text-[1.65rem] font-normal leading-none tracking-wide text-white/[0.08] ${className}`}
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
      aria-hidden
    >
      {label}
    </span>
  );
}
