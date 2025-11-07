import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRightIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GLOBAL_REPORT_DIRECTIVE } from '@/lib/constants';
import { useDaoData } from '@/hooks/use-dao';
import { useAI } from '@/hooks/use-ai';
import { processProposalsForDigest } from '@/lib/dao-utils';
import { NavLink } from 'react-router';
import { DigestCard } from '@/components/digest-card';
import { TextSkeleton } from '@/components/text-skeleton';

interface DaoOverviewCardProps {
  dao: {
    identifier: string;
    name: string;
    logo: string;
  };
}

export function DaoOverviewCard({ dao }: DaoOverviewCardProps) {
  const { proposals, isLoading, error } = useDaoData(dao.identifier);

  // Process the most recent proposals for the AI summary
  const { prompt } = useMemo(
    () => processProposalsForDigest(proposals, isLoading, error),
    [proposals, isLoading, error]
  );

  // Use the AI hook to generate the summary
  const { data: daoSummary, isLoading: loadingSummary } = useAI(
    GLOBAL_REPORT_DIRECTIVE,
    prompt,
    dao.name,
    {
      enabled: prompt !== '',
    }
  );

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <NavLink key={dao.identifier} to={`/dao/${dao.identifier}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage src={dao.logo} alt={dao.name} />
              <AvatarFallback>{dao.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{dao.name}</CardTitle>
              <CardDescription>Overview</CardDescription>
            </div>
          </div>
        </CardHeader>
      </NavLink>
      <CardContent className="pb-0">
        {isLoading ? (
          <div className="space-y-2">
            <TextSkeleton lines={3} />
          </div>
        ) : (
          <div className="bg-muted/20 p-4 rounded-md mb-4 text-sm">
            <DigestCard title="Digest" summary={daoSummary || null} isLoading={loadingSummary} />
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a
            href={`https://snapshot.org/#/${dao.identifier}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            View DAO on Snapshot <ChevronRightIcon className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
