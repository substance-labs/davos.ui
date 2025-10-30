import { Button } from "@/components/ui/button"
import { CircleFadingPlus, CircleMinus } from "lucide-react"
import { toast } from "sonner"

interface DelegateButtonProps {
  hasAgent: boolean;
  userAddress?: string;
  chainId: number;
  daoName: string;
  daoChainId: number;
  isAutomaticFlow: boolean;
  isLoading: boolean;
  isBalanceLoading: boolean;
  isDesktop: boolean;
  onStopAgent: () => void;
  onStartAutoDelegation: () => void;
  onOpenDialog: () => void;
  onNetworkSwitch: () => Promise<boolean>;
  setCurrentStep: (step: string | null) => void;
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export function DelegateButton({
  hasAgent,
  userAddress,
  chainId,
  daoName,
  daoChainId,
  isAutomaticFlow,
  isLoading,
  isBalanceLoading,
  isDesktop,
  onStopAgent,
  onStartAutoDelegation,
  onOpenDialog,
  onNetworkSwitch,
  setCurrentStep,
  setError,
  setIsLoading,
}: DelegateButtonProps) {
  
  const renderButtonContent = () => {
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
  };

  const handleButtonClick = async () => {
    if (hasAgent) {
      onStopAgent();
      return;
    }

    if (!userAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    setCurrentStep(null);
    setError(null);
    
    if (chainId !== daoChainId) {
      setIsLoading(true);
      try {
        const switched = await onNetworkSwitch();
        if (switched) {
          if (isAutomaticFlow) {
            onStartAutoDelegation();
          } else {
            onOpenDialog();
          }
        }
      } catch (err: any) {
        toast.error(`Failed to switch to ${daoName} network`);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (isAutomaticFlow) {
        onStartAutoDelegation();
      } else {
        onOpenDialog();
      }
    }
  };

  return (
    <Button 
      variant="outline"
      onClick={handleButtonClick}
      disabled={isLoading || isBalanceLoading}
      className={isDesktop ? "min-w-[140px]" : "w-full"}
    >
      {renderButtonContent()}
    </Button>
  );
}