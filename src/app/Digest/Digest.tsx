import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { daoConfig } from '@/lib/constants';
import { DigestPeriod } from './types';
import { DaoMonthlyCard } from './components/DaoMonthlyCard';
import { GlobalFilterControls } from './components/GlobalFilterControls';
import { DaoOverviewCard } from './components/DaoOverviewCard';
import { DaoDailyCard } from './components/DaoDailyCard';

export default function Digest() {
  const { tabType = 'overview' } = useParams<{ tabType: DigestPeriod }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract DAO filter from URL if present
  const daoFromURL = searchParams.get('dao');

  // Use the URL parameter to set the initial period
  const [period, setPeriod] = useState<DigestPeriod>(tabType as DigestPeriod);

  const isLoading = false;

  // Global filter for DAOs - initialized from URL param if available
  const [selectedGlobalDao, setSelectedGlobalDao] = useState<string | null>(daoFromURL);

  // Update URL when overview DAO filter changes
  useEffect(() => {
    // Skip during initial loading
    if (isLoading) return;

    // Create new search params
    const newParams = new URLSearchParams();

    // Add dao param if a DAO is selected
    if (selectedGlobalDao) {
      newParams.set('dao', selectedGlobalDao);
    }

    // Update URL without navigation
    setSearchParams(newParams, { replace: true });
  }, [selectedGlobalDao, period, isLoading, setSearchParams]);

  // Initialize filters from URL when component loads or tab changes
  useEffect(() => {
    if (daoFromURL) {
      setSelectedGlobalDao(daoFromURL);
    }
  }, [period, daoFromURL]);

  // Function to clear overview filters
  const clearGlobalFilters = () => {
    setSelectedGlobalDao(null);

    // Also update URL when clearing filters
    if (period === 'overview') {
      setSearchParams({}, { replace: true });
    }
  };

  // Filter overview DAO summaries - Use snapshot as source of Digest info to avoid duplication //TODO handle tally DAOs info
  const filteredDao = selectedGlobalDao
    ? Object.values(daoConfig).filter(
        dao =>
          dao.name.toLowerCase() === selectedGlobalDao &&
          !dao.source.toLowerCase().includes('tally')
      )
    : Object.values(daoConfig).filter(dao => !dao.source.toLowerCase().includes('tally'));

  // Render loading skeletons for daily digest
  const renderSkeletons = () => (
    <>
      {[1, 2, 3].map(i => (
        <div key={i} className="mb-4">
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ))}
    </>
  );

  // Render loading skeletons for monthly digest
  const renderDaoSummarySkeletons = () => (
    <>
      {Object.keys(daoConfig)
        .filter(daoId => !selectedGlobalDao || daoId === selectedGlobalDao)
        .map(daoId => (
          <div key={daoId} className="mb-6">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ))}
    </>
  );

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newPeriod = value as DigestPeriod;
    setPeriod(newPeriod);

    // Construct the query parameters based on the active tab
    const params = new URLSearchParams();

    // Add the appropriate filter parameters based on tab
    if (newPeriod === 'overview' && selectedGlobalDao) {
      params.set('dao', selectedGlobalDao);
    }
    // We could add params for other tabs here too

    // Generate the URL with query string if needed
    const queryString = params.toString() ? `?${params.toString()}` : '';
    navigate(`/digest/${newPeriod}${queryString}`);
  };

  // Handle DAO selection with URL update
  const handleGlobalDaoSelect = (dao: string | null) => {
    setSelectedGlobalDao(dao);

    // No need to update URL here - the useEffect will handle it
  };
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Tabs defaultValue={period} onValueChange={handleTabChange} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="proposals">Daily</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              All Time Overview
            </h2>
          </div>

          {!isLoading && (
            <div className="flex justify-between items-center">
              <GlobalFilterControls
                selectedDao={selectedGlobalDao}
                setSelectedDao={handleGlobalDaoSelect}
              />

              {selectedGlobalDao && (
                <Button variant="outline" size="sm" onClick={clearGlobalFilters}>
                  Show All DAOs
                </Button>
              )}
            </div>
          )}

          {isLoading ? (
            renderDaoSummarySkeletons()
          ) : (
            <>
              {filteredDao.length > 0 ? (
                <div className="space-y-6">
                  {filteredDao.map(dao => (
                    <DaoOverviewCard key={dao.identifier} dao={dao} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-md">
                  <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-1">No DAO summaries found</h3>
                  <p className="text-muted-foreground">
                    There may be an issue loading the data. Please try again later.
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Monthly Tab */}
        <TabsContent value="monthly" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              Monthly Overview
            </h2>
          </div>

          {!isLoading && (
            <div className="flex justify-between items-center">
              <GlobalFilterControls
                selectedDao={selectedGlobalDao}
                setSelectedDao={handleGlobalDaoSelect}
              />

              {selectedGlobalDao && (
                <Button variant="outline" size="sm" onClick={clearGlobalFilters}>
                  Show All DAOs
                </Button>
              )}
            </div>
          )}

          {isLoading ? (
            renderSkeletons()
          ) : (
            <>
              {filteredDao.length > 0 ? (
                <div className="space-y-4">
                  {filteredDao.map(dao => (
                    <DaoMonthlyCard key={dao.identifier} dao={dao} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-md">
                  <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-1">No results found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search term</p>
                  <Button variant="outline" onClick={clearGlobalFilters} className="mt-4">
                    Clear filters
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Daily Tab */}
        <TabsContent value="proposals" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              DAO Proposals
            </h2>
          </div>

          {!isLoading && (
            <div className="flex justify-between items-center">
              <GlobalFilterControls
                selectedDao={selectedGlobalDao}
                setSelectedDao={handleGlobalDaoSelect}
              />

              {selectedGlobalDao && (
                <Button variant="outline" size="sm" onClick={clearGlobalFilters}>
                  Show All DAOs
                </Button>
              )}
            </div>
          )}

          {isLoading ? (
            renderSkeletons()
          ) : (
            <>
              {filteredDao.length > 0 ? (
                <div className="space-y-4">
                  {filteredDao.map(dao => (
                    <DaoDailyCard key={dao.identifier} dao={dao} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-md">
                  <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-1">No results found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search term</p>
                  <Button variant="outline" onClick={clearGlobalFilters} className="mt-4">
                    Clear filters
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
