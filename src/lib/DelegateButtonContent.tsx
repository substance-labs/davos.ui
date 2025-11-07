import { CircleFadingPlus, CircleMinus } from 'lucide-react';

interface DelegateButtonContentProps {
  hasAgent: boolean;
}

export function DelegateButtonContent({ hasAgent }: DelegateButtonContentProps) {
  return hasAgent ? (
    <>
      <CircleMinus className="h-4 w-4 mr-1" />
      Stop Agent
    </>
  ) : (
    <>
      <CircleFadingPlus className="h-4 w-4 mr-1" />
      Voting Agent
    </>
  );
}
