import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExistingBalanceContentProps {
  isDelegationComplete: boolean;
  tokenBalance?: {
    formatted: string;
    symbol: string;
  };
  daoName: string;
  isWrongNetwork: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onManualDelegation: () => void;
  onAutomaticDelegation: () => void;
}

export function ExistingBalanceContent({
  isDelegationComplete,
  tokenBalance,
  daoName,
  isWrongNetwork,
  isLoading,
  onCancel,
  onManualDelegation,
  onAutomaticDelegation
}: ExistingBalanceContentProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">
          {isDelegationComplete ? "Delegation Complete" : "Balance Detected"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isDelegationComplete
            ? "Your tokens have been successfully delegated to the Davos Agent."
            : `DAO token detected in ${daoName}: ${Number(tokenBalance?.formatted).toFixed(4).replace(/\.?0+$/, '')} ${tokenBalance?.symbol}`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        {isDelegationComplete ? (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium">Delegation Successful!</h3>
            <p className="text-muted-foreground">
              Your tokens have been successfully delegated to the Davos Agent.
              You can now participate in governance activities.
            </p>
            <Button onClick={onCancel}>
              Done
            </Button>
          </div>
        ) : (
          <div className="text-center w-full space-y-4">
            <p className="text-sm text-muted-foreground">
              Would you like to delegate your tokens manually or automatically?
            </p>
            <div className="flex flex-wrap justify-center gap-3 w-full">
              <Button
                variant="outline"
                className="min-w-[100px]"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="min-w-[150px]"
                onClick={onManualDelegation}
                disabled={isWrongNetwork || isLoading}
              >
                Manual Delegation
              </Button>
              <Button
                className="min-w-[165px]"
                onClick={onAutomaticDelegation}
                disabled={isWrongNetwork || isLoading}
              >
                Automatic Delegation
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}