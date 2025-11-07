import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerClose,
  DrawerPortal,
  DrawerOverlay,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { DelegateContent } from '@/lib/DelegateContent';
import { X } from 'lucide-react';

interface DelegateDialogProps {
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDelegationComplete: boolean;
  showSetupPhase: boolean;
  showManualDelegation: boolean;
  currentStep: string | null;
  isAutoDelegationProcessActive: boolean;
  isAutomaticFlow: boolean;
  daoName: string;
  agentAddress: string;
  isWrongNetwork: boolean;
  isLoading: boolean;
  tokenBalance: { value: bigint; decimals: number; formatted: string; symbol: string } | undefined;
  hasAgent: boolean;
  hasTokenBalance: boolean;
  onDelegationComplete: () => void;
  onCancel: () => void;
  onManualDelegation: () => void;
  onAutomaticDelegation: () => void;
  onCheckDelegation: () => Promise<{ exists: boolean; target: string | undefined }>;
  onDelegationVerified?: () => void;
}

export function DelegateDialog({
  isDesktop,
  open,
  onOpenChange,
  isDelegationComplete,
  showSetupPhase,
  showManualDelegation,
  currentStep,
  isAutoDelegationProcessActive,
  isAutomaticFlow,
  daoName,
  agentAddress,
  isWrongNetwork,
  isLoading,
  tokenBalance,
  hasAgent,
  hasTokenBalance,
  onDelegationComplete,
  onCancel,
  onManualDelegation,
  onAutomaticDelegation,
  onCheckDelegation,
  onDelegationVerified,
}: DelegateDialogProps) {
  const renderContent = () => (
    <DelegateContent
      isDelegationComplete={isDelegationComplete}
      showSetupPhase={showSetupPhase}
      showManualDelegation={showManualDelegation}
      currentStep={currentStep}
      isAutoDelegationProcessActive={isAutoDelegationProcessActive}
      isAutomaticFlow={isAutomaticFlow}
      daoName={daoName}
      agentAddress={agentAddress}
      isWrongNetwork={isWrongNetwork}
      isLoading={isLoading}
      tokenBalance={tokenBalance}
      hasAgent={hasAgent}
      hasTokenBalance={hasTokenBalance}
      onDelegationComplete={onDelegationComplete}
      onCancel={onCancel}
      onManualDelegation={onManualDelegation}
      onAutomaticDelegation={onAutomaticDelegation}
      onCheckDelegation={onCheckDelegation}
      onDelegationVerified={onDelegationVerified}
    />
  );

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/80" onClick={handleClose} />
          <DialogContent
            className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
            onEscapeKeyDown={handleClose}
            onInteractOutside={() => {
              // Radix UI's onInteractOutside can sometimes be too aggressive.
              // We let the DialogOverlay handle the main click-outside logic.
              // If you still need this, ensure it doesn't conflict.
              // For now, relying on DialogOverlay and onOpenChange from Dialog root.
              // If issues persist, you might call handleClose() here too.
              // console.log("DialogContent: onInteractOutside triggered"); // DEBUG
            }}
          >
            <DialogHeader className="w-full text-center">
              <DialogTitle className="text-lg font-semibold">Set up Voting Agent</DialogTitle>
            </DialogHeader>
            <div className="w-full px-2 py-4">{open && renderContent()}</div>
            <DialogClose
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={true}>
      <DrawerPortal>
        <DrawerOverlay className="fixed inset-0 z-50 bg-black/80" onClick={handleClose} />
        <DrawerContent
          className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background"
          onEscapeKeyDown={handleClose}
          onInteractOutside={() => {
            // Vaul's onInteractOutside (used by Drawer) should work with the overlay.
            // console.log("DrawerContent: onInteractOutside triggered"); // DEBUG
            // Vaul's <DrawerPrimitive.Overlay /> typically handles this by calling onOpenChange.
            // If the explicit DrawerOverlay onClick={handleClose} isn't enough,
            // you might need to call handleClose() here too.
          }}
        >
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />{' '}
          {/* Visual handle for drawer */}
          <DrawerHeader className="text-center">
            <DialogTitle className="text-lg font-semibold">Set up Voting Agent</DialogTitle>
          </DrawerHeader>
          <div className="p-4 overflow-auto">{open && renderContent()}</div>
          <div className="w-full flex justify-end mt-auto p-4 border-t">
            {' '}
            {/* Footer for cancel button */}
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
          <DrawerClose
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
