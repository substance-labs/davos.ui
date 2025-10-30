import { useIsFetching } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isFetching > 0) {
      setShow(true);
    } else {
      // Delay hiding to avoid flickering
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isFetching]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3 rounded-lg border-2 border-primary/20 bg-background px-4 py-3 shadow-xl ring-2 ring-primary/10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            Loading data...
          </span>
          <span className="text-xs text-muted-foreground">
            {isFetching} {isFetching === 1 ? 'request' : 'requests'} in progress
          </span>
        </div>
      </div>
    </div>
  );
}
