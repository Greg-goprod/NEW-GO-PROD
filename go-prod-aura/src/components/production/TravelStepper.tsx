import { ChevronRight } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  completed: boolean;
}

interface TravelStepperProps {
  currentStep: number;
  steps: Step[];
}

export function TravelStepper({ currentStep, steps }: TravelStepperProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors
                ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {step.completed ? '✓' : step.id}
            </div>
            <div className="ml-3">
              <div
                className={`
                  text-sm font-medium
                  ${
                    currentStep === step.id
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                {step.label}
              </div>
            </div>
          </div>

          {index < steps.length - 1 && (
            <div className="flex-1 mx-4">
              <div
                className={`
                  h-1 rounded-full transition-colors
                  ${
                    step.completed
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }
                `}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

