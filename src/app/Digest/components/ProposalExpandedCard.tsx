import { Card, CardContent } from '@/components/ui/card';
import { Mountain } from 'lucide-react';
import { useAI } from '@/hooks/use-ai';
import { PROPROSAL_DIRECTIVE } from '@/lib/constants';
import { useMemo } from 'react';

interface ProposalExpandedCardProps {
  proposal: {
    id: string;
    title: string;
    body: string;
  };
}

export function ProposalExpandedCard({ proposal }: ProposalExpandedCardProps) {
  const prompt = useMemo(() => {
    return `"${proposal.title}" - ${proposal.body}`;
  }, [proposal]);
  const {
    data: daoSummary,
    isLoading: loadingSummary,
    error: summaryError,
  } = useAI(PROPROSAL_DIRECTIVE, prompt, proposal.id, {
    // Only enable when we have a prompt and context
    enabled: prompt !== '',
  });

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5 py-0">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-md mb-2 flex items-center gap-1">
              <Mountain className="h-4 w-4" />
              Proposal Overview
            </h4>

            {loadingSummary ? (
              <p className="text-sm text-gray-500">Generating overview...</p>
            ) : summaryError ? (
              <p className="text-sm text-red-500">Failed to generate summary.</p>
            ) : daoSummary ? (
              <p className="text-sm whitespace-normal break-words overflow-visible">{daoSummary}</p>
            ) : null}
          </div>

          {/* <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <a href={proposal.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                View on Snapshot <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </Button>
          </div> */}
        </div>
      </CardContent>
    </Card>
  );
}
