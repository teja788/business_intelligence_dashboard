/** Lightweight centered modal overlay. */
import type { ReactNode } from 'react';

export function Modal({
  title,
  onClose,
  children,
  width = 'max-w-lg',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] w-full ${width} flex-col overflow-hidden rounded-xl border border-border-strong bg-bg-panel shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
          <h2 className="text-sm font-semibold text-content-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded px-2 text-content-muted hover:bg-bg-elevated hover:text-content-primary"
          >
            ×
          </button>
        </div>
        <div className="v-scroll flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}
