import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount } from 'wagmi';
import Ethos from './components/Ethos';
import { useAgents } from '@/contexts/AgentContext';
import { useAgentDelegationStatus } from '@/hooks/use-agent-delegation-status';
import { DaoConfigItem, DELEGATE_CONTRACT_ADDRESS, SNAPSHOT_DELEGATION_REGISTRY } from '@/lib/constants';
import { Cpu, Copy, Loader2, Eye, EyeOff, User, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const AGENT_ICON_WRAPPER_CLASS = 'bg-blue-100 dark:bg-blue-900/30 rounded-md p-1 mr-2';
const AGENT_ICON_CLASS = 'h-4 w-4 text-blue-600 dark:text-blue-400';

// Component to display a single DAO's voting power
function DaoVotingPowerRow({ dao }: { dao: DaoConfigItem }) {
  const status = useAgentDelegationStatus(dao);
  
  const formattedVotingPower = (votingPower: string) => {
    const num = parseFloat(votingPower);
    if (num === 0) return '0';
    if (num < 0.01) return '< 0.01';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {dao.logo && (
          <img src={dao.logo} alt={dao.name} className="h-5 w-5 rounded-full" />
        )}
        <span className="text-sm text-muted-foreground">{dao.name}</span>
      </div>
      {status.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <span className="text-sm font-medium">
          {formattedVotingPower(status.votingPower)} {status.tokenSymbol}
        </span>
      )}
    </div>
  );
}

// Agent Info card component
function AgentInfoCard() {
  const { agents, isLoading: agentsLoading } = useAgents();
  const [isHidden, setIsHidden] = useState(false);

  // Get the first agent to get the agent address (same for all DAOs for a user)
  const firstAgentStatus = useAgentDelegationStatus(
    agents[0]?.dao || { identifier: '', name: '', icon: '', source: 'snapshot', chainId: 1, tokenAddress: '' }
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Check if there are any agents
  const hasAgents = agents.length > 0;
  const agentAddress = firstAgentStatus.agentAddress;

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <span className={AGENT_ICON_WRAPPER_CLASS}>
            <Cpu className={AGENT_ICON_CLASS} />
          </span>
          Agent Info
        </CardTitle>
        {hasAgents && (
          <button
            onClick={() => setIsHidden(!isHidden)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title={isHidden ? 'Show details' : 'Hide details'}
          >
            {isHidden ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </CardHeader>
      <CardContent className={`transition-all ${isHidden ? 'blur-sm select-none pointer-events-none' : ''}`}>
        {agentsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasAgents ? (
          <p className="text-sm text-muted-foreground">No agent enabled</p>
        ) : (
          <div className="space-y-4">
            {/* Agent Address */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Agent Address</span>
              {firstAgentStatus.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : agentAddress ? (
                <button
                  onClick={() => copyToClipboard(agentAddress)}
                  className="flex items-center gap-1.5 text-sm font-mono hover:text-primary transition-colors"
                  title="Click to copy"
                >
                  {truncateAddress(agentAddress)}
                  <Copy className="h-3 w-3" />
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Delegation Power by DAO - Separated by Source */}
            <div>
              <p className="text-sm font-medium mb-3">Delegation Power</p>
              
              {/* Snapshot DAOs */}
              {agents.filter(a => a.dao.source === 'snapshot').length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/snapshot-logo.svg" className="h-4 w-4" alt="Snapshot" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Snapshot</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {agents
                      .filter(a => a.dao.source === 'snapshot')
                      .map((agent) => (
                        <DaoVotingPowerRow key={agent.dao.identifier} dao={agent.dao} />
                      ))}
                  </div>
                </div>
              )}

              {/* Tally DAOs */}
              {agents.filter(a => a.dao.source === 'tally').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/tally-logo.svg" className="h-4 w-4 dark:invert" alt="Tally" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tally</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {agents
                      .filter(a => a.dao.source === 'tally')
                      .map((agent) => (
                        <DaoVotingPowerRow key={agent.dao.identifier} dao={agent.dao} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Davos Info card component
function DavosInfoCard() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const truncateAddress = (address: string) => {
    if (!address) return '—';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const contracts = [
    {
      name: 'DeleGate (Ethos & Agents)',
      address: DELEGATE_CONTRACT_ADDRESS,
      chainId: 1,
      explorer: 'https://polygonscan.com/address/',
    },
    {
      name: 'Snapshot Delegation Registry',
      address: SNAPSHOT_DELEGATION_REGISTRY,
      chainId: 1,
      explorer: 'https://etherscan.io/address/',
    },
  ];

  return (
    <Card className="mx-4 lg:mx-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <span className={AGENT_ICON_WRAPPER_CLASS}>
            <Info className={AGENT_ICON_CLASS} />
          </span>
          Davos Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-3">Smart Contracts</p>
            <div className="space-y-2">
              {contracts.map((contract) => (
                <div key={contract.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{contract.name}</span>
                  {contract.address ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(contract.address!)}
                        className="flex items-center gap-1.5 text-sm font-mono hover:text-primary transition-colors"
                        title="Click to copy"
                      >
                        {truncateAddress(contract.address)}
                        <Copy className="h-3 w-3" />
                      </button>
                      <a
                        href={`${contract.explorer}${contract.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="View on Etherscan"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not configured</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Profile() {
  const account = useAccount();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // const { ethos, setEthos } = useEthos();

  // const handleEthosSelect = (selectedEthos: string, isCustom: boolean, customText?: string) => {
  //   // If it's a custom ethos, use the custom text
  //   // Otherwise use the selected ethos title as the ethos
  //   const newEthos = isCustom && customText ? customText : selectedEthos;

  //   setEthos(newEthos);
  //   toast("Ethos", {
  //     description: "Ethos updated successfully",
  //   });
  // };

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <Card className="mx-4 lg:mx-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <span className={AGENT_ICON_WRAPPER_CLASS}>
                <User className={AGENT_ICON_CLASS} />
              </span>
              Account Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Address</span>
                {account.address ? (
                  <button
                    onClick={() => copyToClipboard(account.address!)}
                    className="flex items-center gap-1.5 text-sm font-mono hover:text-primary transition-colors"
                    title="Click to copy"
                  >
                    {`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                    <Copy className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="text-sm font-medium capitalize">{account.status}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <AgentInfoCard />

        <Card className="mx-4 lg:mx-6">
          <CardContent>
            <Ethos />
          </CardContent>
        </Card>

        <DavosInfoCard />
      </div>
    </div>
  );
}

export default Profile;
