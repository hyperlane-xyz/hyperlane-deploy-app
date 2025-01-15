import clsx from 'clsx';

export function Stepper({
  numSteps,
  currentStep,
  size = 6,
  pulse = false,
  className,
}: {
  numSteps: number;
  currentStep: number;
  size?: number;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <div
      style={{ gap: size }}
      className={clsx('flex flex-wrap items-center justify-center', className)}
    >
      {Array.from({ length: numSteps }, (_, i) => i + 1).map((i) => {
        const isCurrent = i === currentStep;
        return (
          <div
            key={i}
            style={{
              height: isCurrent ? Math.round(size * 1.6) : size,
              width: isCurrent ? Math.round(size * 1.6) : size,
            }}
            className={clsx(
              'rounded-full',
              isCurrent ? 'bg-primary-300' : 'bg-blue-200',
              isCurrent && pulse && 'animate-pulse',
            )}
          />
        );
      })}
    </div>
  );
}
