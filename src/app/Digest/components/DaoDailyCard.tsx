import { useMemo, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, ChevronRightIcon, FilterIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FILTERED_PROPOSAL_DIRECTIVE } from '@/lib/constants';
import { useDaoData } from '@/hooks/use-dao';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ProposalExpandedCard } from './ProposalExpandedCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useAI } from '@/hooks/use-ai';
import { DigestCard } from '@/components/digest-card';
import { TextSkeleton } from '@/components/text-skeleton';

type ProposalStatus = 'active' | 'closed' | 'pending' | 'all';

interface FilterState {
  status: ProposalStatus;
  startDate: Date | null;
  endDate: Date | null;
}

interface DaoDailyCardProps {
  dao: {
    identifier: string;
    name: string;
    logo: string;
  };
}

export function DaoDailyCard({ dao }: DaoDailyCardProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // State to track which rows are expanded
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    status: 'active',
    startDate: null,
    endDate: null,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Initialize filters from URL on component mount - only if a specific DAO is selected
  useEffect(() => {
    // Only read URL parameters if we're viewing a specific DAO
    if (!dao || !dao.identifier) {
      // We're likely in "all DAOs" view, don't process URL parameters
      return;
    }

    const searchParams = new URLSearchParams(location.search);

    const status = searchParams.get('status') as ProposalStatus;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const page = searchParams.get('page');

    // Only update if there are params to avoid unnecessary state changes
    if (status || startDateParam || endDateParam || page) {
      setFilters(prev => ({
        status:
          status && ['active', 'closed', 'pending', 'all'].includes(status) ? status : prev.status,
        startDate: startDateParam ? new Date(startDateParam) : prev.startDate,
        endDate: endDateParam ? new Date(endDateParam) : prev.endDate,
      }));

      if (page && !isNaN(parseInt(page))) {
        setCurrentPage(parseInt(page));
      }
    }
  }, [location.search, dao]);

  // Update URL when filters change - only if a single DAO is selected
  useEffect(() => {
    // Only update URL if we're viewing a specific DAO
    if (!dao || !dao.identifier) {
      // We're likely in "all DAOs" view, don't modify the URL
      return;
    }

    const searchParams = new URLSearchParams(location.search);

    // Update filter params
    if (filters.status !== 'all') {
      searchParams.set('status', filters.status);
    } else {
      searchParams.delete('status');
    }

    if (filters.startDate) {
      searchParams.set('startDate', filters.startDate.toISOString());
    } else {
      searchParams.delete('startDate');
    }

    if (filters.endDate) {
      searchParams.set('endDate', filters.endDate.toISOString());
    } else {
      searchParams.delete('endDate');
    }

    // Update page param
    if (currentPage > 1) {
      searchParams.set('page', currentPage.toString());
    } else {
      searchParams.delete('page');
    }

    // Update URL if params changed
    const newQueryString = searchParams.toString();
    const hash = location.hash.split('?')[0]; // Get the base hash without query params
    const newUrl = newQueryString ? `${hash}?${newQueryString}` : hash;

    // Use navigate to update the hash portion of the URL
    navigate(newUrl, { replace: true });
  }, [filters, currentPage, location.hash, navigate, dao]);

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const { proposals, isLoading, error } = useDaoData(dao.identifier);

  interface ProposalItem {
    id: string;
    title: string;
    body: string;
    state: string;
    start: number;
    end: number;
    scores_total?: number;
  }

  // Filter proposals based on selected filters
  const filteredProposals = useMemo(() => {
    if (isLoading || error || !proposals.length) return [];

    return (proposals as ProposalItem[]).filter(proposal => {
      // Filter by status
      if (filters.status !== 'all' && proposal.state !== filters.status) {
        return false;
      }

      // Filter by start date
      if (filters.startDate) {
        const proposalStart = new Date(proposal.start * 1000);
        if (proposalStart < filters.startDate) {
          return false;
        }
      }

      // Filter by end date
      if (filters.endDate) {
        const proposalEnd = new Date(proposal.end * 1000);
        if (proposalEnd > filters.endDate) {
          return false;
        }
      }

      return true;
    });
  }, [proposals, filters, isLoading, error]);

  const prompt = useMemo(() => {
    if (proposals.length === 0) return '';

    // Create a concatenated string of all latest proposal titles and short body excerpts
    const proposalSummaries = filteredProposals
      .map(p => `BEGIN "${p.title}" - ${p.body} END`)
      .join('\n');

    return `Recent proposals: ${proposalSummaries}`;
  }, [filteredProposals, proposals.length]);

  const { data: daoSummary, isLoading: loadingSummary } = useAI(
    FILTERED_PROPOSAL_DIRECTIVE,
    prompt,
    dao.name,
    {
      // Only enable when we have a prompt and context
      enabled: prompt !== '',
      // Use a longer stale time for summaries (30 min)
      staleTime: 30 * 60 * 1000,
    }
  );

  // Calculate total pages
  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage);

  // Get current page items
  const currentProposals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProposals.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProposals, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const updateStatusFilter = (status: ProposalStatus) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const updateStartDate = (date: Date | null) => {
    setFilters(prev => ({ ...prev, startDate: date }));
  };

  const updateEndDate = (date: Date | null) => {
    setFilters(prev => ({ ...prev, endDate: date }));
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      startDate: null,
      endDate: null,
    });
  };

  // Generate pagination links
  const paginationLinks = () => {
    const links = [];

    // Always show first page
    links.push(
      <PaginationItem key="first">
        <PaginationLink isActive={currentPage === 1} onClick={() => setCurrentPage(1)}>
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Add ellipsis if needed
    if (currentPage > 3) {
      links.push(
        <PaginationItem key="ellipsis-1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Add pages around the current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Adjust to show at least 3 pages if possible
    if (startPage === 2) endPage = Math.min(totalPages - 1, 4);
    if (endPage === totalPages - 1) startPage = Math.max(2, totalPages - 3);

    for (let i = startPage; i <= endPage; i++) {
      links.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => setCurrentPage(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Add ellipsis if needed
    if (currentPage < totalPages - 2) {
      links.push(
        <PaginationItem key="ellipsis-2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      links.push(
        <PaginationItem key="last">
          <PaginationLink
            isActive={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return links;
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <NavLink key={dao.identifier} to={`/dao/${dao.identifier}`} className="flex items-center">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage src={dao.logo} alt={dao.name} />
              <AvatarFallback>{dao.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{dao.name}</CardTitle>
              <CardDescription>Proposals</CardDescription>
            </div>
          </NavLink>

          {/* Filter Controls */}
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <FilterIcon className="h-4 w-4" />
                  <span>Filters</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Proposals</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Status
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => updateStatusFilter('all')}>
                    <div className="cursor-pointer w-full flex items-center justify-between">
                      All
                      {filters.status === 'all' && <span className="text-primary">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatusFilter('active')}>
                    <div className="cursor-pointer w-full flex items-center justify-between">
                      Active
                      {filters.status === 'active' && <span className="text-primary">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatusFilter('pending')}>
                    <div className="cursor-pointer w-full flex items-center justify-between">
                      Pending
                      {filters.status === 'pending' && <span className="text-primary">✓</span>}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateStatusFilter('closed')}>
                    <div className="cursor-pointer w-full flex items-center justify-between">
                      Closed
                      {filters.status === 'closed' && <span className="text-primary">✓</span>}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Date Range
                  </DropdownMenuLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left font-normal"
                      >
                        {filters.startDate ? format(filters.startDate, 'PPP') : 'Start Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.startDate || undefined}
                        onSelect={date => updateStartDate(date || null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left font-normal"
                      >
                        {filters.endDate ? format(filters.endDate, 'PPP') : 'End Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.endDate || undefined}
                        onSelect={date => updateEndDate(date || null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="w-full justify-center"
                >
                  Reset Filters
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-0">
        {!isLoading && filteredProposals.length > 0 && (
          <>
            <div className="bg-muted/20 p-3 pt-0 rounded-md mx-10 mb-4 text-sm ">
              <DigestCard
                title="Daily Digest"
                summary={daoSummary || null}
                isLoading={loadingSummary}
              />
            </div>

            <div className="bg-muted/20 p-3 pt-0 rounded-md mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Expand row to get details about the selected proposal
              </p>
              <p className="text-sm font-medium">
                {filteredProposals.length} proposal{filteredProposals.length !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
        {isLoading ? (
          <div className="space-y-2">
            <TextSkeleton lines={3} />
          </div>
        ) : filteredProposals.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scores</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentProposals.map(proposal => (
                    <>
                      <TableRow key={proposal.id}>
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRowExpand(proposal.id)}
                            aria-label={
                              expandedRows[proposal.id] ? 'Collapse details' : 'Expand details'
                            }
                          >
                            {expandedRows[proposal.id] ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell
                          className="font-medium truncate max-w-[200px]"
                          title={proposal.title}
                        >
                          {proposal.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={proposal.state === 'active' ? 'default' : 'outline'}>
                            {proposal.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {proposal.scores_total
                            ? `${proposal.scores_total.toLocaleString()} votes`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(proposal.start * 1000).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{new Date(proposal.end * 1000).toLocaleDateString()}</TableCell>
                      </TableRow>
                      {expandedRows[proposal.id] && (
                        <TableRow className="bg-muted/5">
                          <TableCell></TableCell>
                          <TableCell colSpan={5} className="py-2">
                            <ProposalExpandedCard proposal={proposal} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredProposals.length > itemsPerPage && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {paginationLinks()}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={e => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={
                          currentPage === totalPages ? 'pointer-events-none opacity-50' : ''
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="bg-muted/20 p-4 rounded-md mb-4 text-center text-muted-foreground">
            No proposals found matching your filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}
