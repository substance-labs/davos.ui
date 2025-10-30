import { Button } from "@/components/ui/button";

interface DelegationSuccessContentProps {
  onDone: () => void;
}

export function DelegationSuccessContent({ onDone }: DelegationSuccessContentProps) {
  return (
    <div className="text-center space-y-4">
      <h3 className="text-lg font-medium">Delegation Successful!</h3>
      <p className="text-muted-foreground">
        Your tokens have been successfully delegated to the Davos Agent.
        You can now participate in governance activities.
      </p>
      <Button onClick={onDone}>
        Done
      </Button>
    </div>
  );
}