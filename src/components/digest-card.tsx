import { useState } from 'react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mountain } from 'lucide-react';
import Markdown from 'react-markdown';
import { LoadingSpinner } from './ui/loading-spinner';

interface DigestCardProps {
  title: string;
  summary: string | null;
  isLoading: boolean;
  expandable?: boolean;
  minLengthForToggle?: number;
}

export function DigestCard({
  title,
  summary,
  isLoading,
  expandable = true,
  minLengthForToggle = 100,
}: DigestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const showToggle = expandable && summary && summary.length > minLengthForToggle;

  return (
    <Card onClick={() => (!expanded && expandable ? setExpanded(true) : null)}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <span className="bg-primary/10 p-1 rounded-md mr-2 flex items-center justify-center">
            <Mountain className="h-4 w-4 text-primary" />
          </span>
          {title}
        </CardTitle>
        <CardAction>
          {showToggle && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs h-6 px-2 flex items-center gap-1 text-muted-foreground"
            >
              {expanded ? 'Show less' : 'Show more'}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      {isLoading ? (
        <LoadingSpinner />
      ) : summary ? (
        <CardContent>
          <div className="relative px-4">
            <div className={expanded ? '' : 'max-h-[125px] overflow-hidden'}>
              <Markdown>{summary}</Markdown>
            </div>
            {!expanded && showToggle && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
