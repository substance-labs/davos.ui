import { DelegationSuccessContent } from '@/lib/DelegationSuccessContent';
import { SetupStepper } from '@/lib/SetupStepper';
import { ManualDelegationContent } from '@/lib/ManualDelegationContent';
import { ExistingBalanceContent } from '@/lib/ExistingBalanceContent';

interface DelegateContentProps {
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

export function DelegateContent({
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
}: DelegateContentProps) {
  return (
    <>
      {isDelegationComplete ? (
        <DelegationSuccessContent onDone={onDelegationComplete} />
      ) : showSetupPhase ? (
        <SetupStepper
          currentStep={currentStep}
          isAutoDelegationProcessActive={isAutoDelegationProcessActive}
          isAutomaticFlow={isAutomaticFlow}
        />
      ) : showManualDelegation ? (
        <ManualDelegationContent
          daoName={daoName}
          agentAddress={agentAddress}
          isWrongNetwork={isWrongNetwork}
          isLoading={isLoading}
          hideNoTokensText={true}
          onCheckDelegation={onCheckDelegation}
          onDelegationVerified={onDelegationVerified}
        />
      ) : hasTokenBalance && !hasAgent ? (
        <ExistingBalanceContent
          isDelegationComplete={isDelegationComplete}
          tokenBalance={tokenBalance}
          daoName={daoName}
          isWrongNetwork={isWrongNetwork}
          isLoading={isLoading}
          onCancel={onCancel}
          onManualDelegation={onManualDelegation}
          onAutomaticDelegation={onAutomaticDelegation}
        />
      ) : (
        <ManualDelegationContent
          daoName={daoName}
          agentAddress={agentAddress}
          isWrongNetwork={isWrongNetwork}
          isLoading={isLoading}
          hideNoTokensText={false}
          onCheckDelegation={onCheckDelegation}
          onDelegationVerified={onDelegationVerified}
        />
      )}
    </>
  );
}
