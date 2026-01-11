import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/stepper';

export interface StepConfig {
  id: string;
  title: string;
  description: string;
}

export const STEP_CONFIG = {
  base: [
    {
      id: 'create-kms-adapter',
      title: 'Secure Key Management',
      description: 'Deploy secure key management adapter.',
    },
    {
      id: 'create-agent',
      title: 'Voting Agent Instance',
      description: 'Initialize your voting agent instance.',
    },
    {
      id: 'enable-agent',
      title: 'On-Chain Activation',
      description: 'Activate the agent on-chain.',
    },
    {
      id: 'complete',
      title: 'Setup Complete',
      description: 'Your agent is ready for manual delegation.',
    },
  ],
  automatic: [
    {
      id: 'predict-address',
      title: 'Address Prediction',
      description: 'Predicting agent address.',
    },
    { id: 'delegate-tokens', title: 'Delegation', description: 'Delegate your tokens on-chain.' },
    { id: 'create-agent', title: 'Agent Creation', description: 'Creating your voting agent.' },
    { id: 'complete', title: 'Setup Complete', description: 'Your agent is ready.' },
  ],
  manual: [
    {
      id: 'create-kms-adapter',
      title: 'Secure Key Management',
      description: 'Deploy secure key management adapter.',
    },
    {
      id: 'create-agent',
      title: 'Voting Agent Instance',
      description: 'Initialize your voting agent instance.',
    },
    {
      id: 'enable-agent',
      title: 'On-Chain Activation',
      description: 'Activate the agent on-chain.',
    },
    {
      id: 'complete',
      title: 'Setup Complete',
      description: 'Your agent is ready for manual delegation.',
    },
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
  isAutomaticFlow,
}: SetupStepperProps) {
  let config: StepConfig[];
  let stepperKey: string;

  // When auto-delegation is active, use the automatic config to show delegation step
  if (isAutoDelegationProcessActive || isAutomaticFlow) {
    config = STEP_CONFIG.automatic;
    stepperKey = 'stepper-automatic';
  } else {
    config = STEP_CONFIG.base;
    stepperKey = 'stepper-base';
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
          key={`${stepperKey}-${currentStep ?? 'init'}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialStep={(currentStep ?? config[0].id) as any}
          variant="vertical"
        >
          {() => (
            <Stepper.Navigation aria-label="Agent Setup Process">
              {config.map(step => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
