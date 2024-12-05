import clsx from 'clsx';

export function Stepper({ numSteps, currentStep }: { numSteps: number; currentStep: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: numSteps }, (_, i) => i + 1).map((i) => (
        <div
          key={i}
          className={clsx(
            'h-1.5 w-1.5 rounded-full',
            i === currentStep ? 'h-2.5 w-2.5 bg-primary-300' : 'bg-blue-200',
          )}
        />
      ))}
    </div>
  );
}
