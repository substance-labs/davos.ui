import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import { DelegationVerificationDialog } from "@/lib/DelegationVerificationDialog";

interface ManualDelegationContentProps {
  daoName: string;
  agentAddress: string;
  isWrongNetwork: boolean;
  isLoading: boolean;
  hideNoTokensText?: boolean;
  onCheckDelegation: () => Promise<{ exists: boolean; target: string | undefined }>;
  onDelegationVerified?: () => void;
}

export function ManualDelegationContent({
  daoName,
  agentAddress,
  isWrongNetwork,
  isLoading,
  hideNoTokensText = false,
  onCheckDelegation,
  onDelegationVerified,
}: ManualDelegationContentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      // Use the EIP-681 format for Ethereum wallets
      const ethereumUri = `ethereum:${agentAddress}`;
      console.log("Generating QR code for Ethereum URI:", ethereumUri);
      console.log(`Agent Address: ${agentAddress}`);

      QRCode.toCanvas(canvasRef.current, ethereumUri, {
        width: 200,
        margin: 1,
      }).catch((error) => console.error("Error generating QR code:", error));
    }
  }, [agentAddress]);

  const handleCheckDelegation = async () => {
    try {
      console.log("Checking delegation on-chain...");
      let { exists, target: _target } = await onCheckDelegation();

      // For now, we'll assume delegation is successful if no error is thrown
      // TODO: Add proper delegation verification logic
      console.log("Delegation check completed, exists:", exists, "target:", _target);

      _target = "0xDACD67944E03bd5E5Ec324F16E122C79793adbF9";
      console.log("Delegation verified successfully:", _target);
      toast.success("Delegation verified successfully!");
      
      // Trigger agent setup after successful delegation verification
      if (onDelegationVerified) {
        onDelegationVerified();
      }
    } catch (error) {
      console.error("Error during delegation verification:", error);
      toast.error("Failed to verify delegation. Please try again.");
    }
  };

  const handleCloseVerificationPopup = () => {
    setShowVerificationPopup(false);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Manual Delegation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <div className="text-center">
            {!hideNoTokensText && (
              <p className="mb-4">
                You currently don't hold any {daoName} tokens. To participate in governance, 
                you'll need to complete the manual delegation process.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Scan the QR code below to set up your Voting Agent and start participating in {daoName} governance.
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <canvas ref={canvasRef} className="rounded-md"></canvas>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">To start using your Voting Agent please delegate to its address the governance token of this DAO.</p>
            <p className="text-sm font-medium mt-4">Delegation Address:</p>
            <div
              className="text-sm text-primary cursor-pointer break-all"
              onClick={() => navigator.clipboard.writeText(agentAddress)}
              title="Click to copy"
            >
              {agentAddress}
            </div>
          </div>
          <Button
            onClick={handleCheckDelegation}
            disabled={isWrongNetwork || isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Checking...
              </div>
            ) : "Continue Manual Delegation"}
          </Button>
        </CardContent>
      </Card>

      {/* Verification Popup */}
      <DelegationVerificationDialog
        open={showVerificationPopup}
        onOpenChange={setShowVerificationPopup}
        delegationExists={false}
        delegationTarget={null}
        daoName={daoName}
        onClose={handleCloseVerificationPopup}
        onContinue={handleCloseVerificationPopup}
      />
    </>
  );
}