import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge, badgeVariants } from './badge';
import type { VariantProps } from 'class-variance-authority';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, CircleOff } from 'lucide-react'; // Import Lucide icons

type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

export interface CountdownProps extends React.HTMLAttributes<HTMLDivElement> {
  endDate: string | number | Date;
  compact?: boolean;
  badgeVariant?: BadgeProps['variant'];
  onComplete?: () => void;
  className?: string;
  hoursOffset?: number;
  proposalId?: string;
  voteStatus?: 'yes' | 'no' | 'not-voted' | null; // Add this prop to accept vote status from parent
}

export function Countdown({
  endDate,
  compact = false,
  badgeVariant,
  onComplete,
  className,
  hoursOffset = 0,
  proposalId: _proposalId, // eslint-disable-line @typescript-eslint/no-unused-vars
  voteStatus = null, // Default to null if not provided
  ...props
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  // Add state to track the pulse animation
  const [pulse, setPulse] = React.useState(false);

  // Reference to previous time values to detect changes
  const prevTimeRef = React.useRef({
    days: -1,
    hours: -1,
    minutes: -1,
    seconds: -1,
  });

  // Remove the local vote status determination
  // The voteStatus is now passed from the parent component

  React.useEffect(() => {
    const endDateTime = new Date(endDate).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      // Apply hoursOffset by subtracting hours in milliseconds from the end date
      const offsetMilliseconds = hoursOffset * 60 * 60 * 1000;
      const adjustedEndTime = endDateTime - offsetMilliseconds;
      const difference = adjustedEndTime - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });

        if (onComplete) {
          onComplete();
        }
        return;
      }

      // Calculate time units
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Check if any value has changed
      const hasChanged =
        days !== prevTimeRef.current.days ||
        hours !== prevTimeRef.current.hours ||
        minutes !== prevTimeRef.current.minutes ||
        seconds !== prevTimeRef.current.seconds;

      // Only trigger pulse if something changed
      if (hasChanged) {
        setPulse(true);
        setTimeout(() => {
          setPulse(false);
        }, 500);
      }

      // Update reference values for next comparison
      prevTimeRef.current = {
        days,
        hours,
        minutes,
        seconds,
      };

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
      });
    };

    // Update immediately
    updateCountdown();

    // Update every second for a smoother countdown experience
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endDate, onComplete, hoursOffset]);

  // Determine badge variant dynamically
  const determineBadgeVariant = (): BadgeProps['variant'] => {
    if (badgeVariant) return badgeVariant;

    if (timeLeft.isExpired) {
      if (voteStatus === 'yes') return 'default';
      if (voteStatus === 'no') return 'destructive';
      return 'outline'; // Not voted
    }

    if (timeLeft.days > 0) return 'secondary'; // More than 1 day - default (green)

    if (timeLeft.days === 0) {
      if (timeLeft.hours < 2) return 'destructive'; // Less than 2 hours - destructive (red)
      if (timeLeft.hours < 24) return 'default'; // Less than 24 hours - secondary (purple)
    }

    return 'default'; // Default for longer times
  };

  const formatTimeValue = (value: number) => {
    return value < 10 ? `0${value}` : `${value}`;
  };

  // Different display formats based on time left and compact mode
  const getDisplayText = () => {
    if (timeLeft.isExpired) {
      if (voteStatus === 'yes') {
        return (
          <div className="flex items-center">
            <Check className="mr-1 h-3 w-3" />
            <span>Voted Yes</span>
          </div>
        );
      } else if (voteStatus === 'no') {
        return (
          <div className="flex items-center">
            <X className="mr-1 h-3 w-3" />
            <span>Voted No</span>
          </div>
        );
      } else {
        // Just show the icon for "Not Voted" status, text goes in tooltip
        return (
          <div className="flex items-center justify-center">
            <CircleOff className="h-3 w-3" />
          </div>
        );
      }
    }

    const showSeconds = timeLeft.days === 0 && timeLeft.hours === 0;

    // Determine which unit should be animated based on actual changes
    const animateSeconds = pulse && prevTimeRef.current.seconds !== timeLeft.seconds;
    const animateMinutes = pulse && prevTimeRef.current.minutes !== timeLeft.minutes;
    const animateHours = pulse && prevTimeRef.current.hours !== timeLeft.hours;
    const animateDays = pulse && prevTimeRef.current.days !== timeLeft.days;

    if (compact) {
      if (timeLeft.days > 0) {
        return (
          <>
            <span className={animateDays ? 'animate-pulse-seconds' : ''}>{timeLeft.days}d</span>
            <span> {formatTimeValue(timeLeft.hours)}h</span>
          </>
        );
      }

      if (timeLeft.hours > 0) {
        return (
          <>
            <span className={animateHours ? 'animate-pulse-seconds' : ''}>
              {formatTimeValue(timeLeft.hours)}h
            </span>
            <span className={animateMinutes ? 'animate-pulse-seconds' : ''}>
              {' '}
              {formatTimeValue(timeLeft.minutes)}m
            </span>
            {showSeconds && (
              <span className={animateSeconds ? 'animate-pulse-seconds' : ''}>
                {' '}
                {formatTimeValue(timeLeft.seconds)}s
              </span>
            )}
          </>
        );
      }

      return (
        <>
          <span className={animateMinutes ? 'animate-pulse-seconds' : ''}>
            {formatTimeValue(timeLeft.minutes)}m
          </span>
          {showSeconds && (
            <span className={animateSeconds ? 'animate-pulse-seconds' : ''}>
              {' '}
              {formatTimeValue(timeLeft.seconds)}s
            </span>
          )}
        </>
      );
    } else {
      // Full format with all units
      return (
        <>
          {timeLeft.days > 0 && (
            <span className={animateDays ? 'animate-pulse-seconds' : ''}>{timeLeft.days}d </span>
          )}
          <span className={animateHours ? 'animate-pulse-seconds' : ''}>
            {formatTimeValue(timeLeft.hours)}h
          </span>
          <span className={animateMinutes ? 'animate-pulse-seconds' : ''}>
            {' '}
            {formatTimeValue(timeLeft.minutes)}m
          </span>
          {showSeconds && (
            <span className={animateSeconds ? 'animate-pulse-seconds' : ''}>
              {' '}
              {formatTimeValue(timeLeft.seconds)}s
            </span>
          )}
        </>
      );
    }
  };

  // Handle tooltip content based on state
  const getTooltipContent = () => {
    if (timeLeft.isExpired) {
      if (voteStatus === 'not-voted') {
        return 'Not Voted by Agent';
      } else if (voteStatus === 'yes') {
        return 'Agent voted Yes';
      } else if (voteStatus === 'no') {
        return 'Agent voted No';
      }
    }
    return 'Time to Agent Vote';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={determineBadgeVariant()}
            className={cn(
              'select-none tabular-nums countdown-badge',
              !timeLeft.isExpired && 'relative', // Only add the indicator dot styling when not expired
              className
            )}
            {...props}
          >
            {getDisplayText()}
            {!timeLeft.isExpired && <span className="countdown-indicator" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
