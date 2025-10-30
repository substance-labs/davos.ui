import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Stepper } from "@/components/stepper"

export interface StepConfig {
  id: string;
  title: string;
  description: string;
}

export const STEP_CONFIG = {
  base: [
    { id: "create-kms-adapter", title: "Secure Key Management", description: "Deploy secure key management adapter." },
    { id: "create-agent", title: "Voting Agent Instance", description: "Initialize your voting agent instance." },
    { id: "enable-agent", title: "On-Chain Activation", description: "Activate the agent on-chain." },
    { id: "complete", title: "Setup Complete", description: "Your agent is ready for manual delegation." },
  ],
  automatic: [
    { id: "delegate-tokens", title: "Delegation", description: "Delegate your tokens on-chain." },
    { id: "predict-address", title: "Address Prediction", description: "Predicting agent address." },
    { id: "verify-delegation", title: "Verify Delegation", description: "Verifying delegation on-chain." },
    { id: "create-kms-adapter", title: "Security Setup", description: "Setting up security infrastructure." },
    { id: "create-agent", title: "Agent Creation", description: "Creating your voting agent." },
    { id: "enable-agent", title: "Agent Activation", description: "Activating the agent on-chain." },
    { id: "complete", title: "Setup Complete", description: "Your agent is ready." },
  ],
  manual: [
    { id: "create-kms-adapter", title: "Secure Key Management", description: "Deploy secure key management adapter." },
    { id: "create-agent", title: "Voting Agent Instance", description: "Initialize your voting agent instance." },
    { id: "enable-agent", title: "On-Chain Activation", description: "Activate the agent on-chain." },
    { id: "complete", title: "Setup Complete", description: "Your agent is ready for manual delegation." },
  ],
};

interface SetupStepperProps {
  currentStep: string | null;
  isAutoDelegationProcessActive: boolean;
  isAutomaticFlow: boolean;
}

export function SetupStepper({
  currentStep,
  isAutoDelegationProcessActive,
  isAutomaticFlow
}: SetupStepperProps) {
  let config: StepConfig[];
  let _configNameForLog: string;
  let stepperKey: string;

  if (isAutoDelegationProcessActive) {
    config = STEP_CONFIG.base; 
    _configNameForLog = "base (forced for active auto setup process)";
    stepperKey = "stepper-base";
  } else {
    config = isAutomaticFlow ? STEP_CONFIG.automatic : STEP_CONFIG.base;
    _configNameForLog = isAutomaticFlow ? "automatic (DAO default)" : "base (DAO default)";
    stepperKey = `stepper-${_configNameForLog.startsWith("base") ? "base" : "automatic"}`;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Voting Agent Setup</CardTitle>
        <p className="text-sm text-muted-foreground">
          Follow the steps to complete the agent setup process.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Stepper.Provider
          key={`${stepperKey}-${currentStep ?? "init"}`}
          initialStep={(currentStep ?? config[0].id) as any}
          variant="vertical"
        >
          {({ methods: _methods }) => (
            <Stepper.Navigation aria-label="Agent Setup Process">
              {config.map((step) => (
                <Stepper.Step key={step.id} of={step.id as any}>
                  <Stepper.Title>{step.title}</Stepper.Title>
                  <Stepper.Description>{step.description}</Stepper.Description>
                </Stepper.Step>
              ))}
            </Stepper.Navigation>
          )}
        </Stepper.Provider>
      </CardContent>
    </Card>
  );
}