import { PropsWithChildren } from 'react';

interface Props {
  className?: string;
}

export function Card({ className, children }: PropsWithChildren<Props>) {
  return (
    <div
      className={`relative max-w-full overflow-auto rounded-2xl bg-white p-3 sm:p-4 ${className}`}
    >
      {children}
    </div>
  );
}
