import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useNavigate } from "react-router"
import { ArrowLeft } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  const navigate = useNavigate()
  const [currentPath, setCurrentPath] = useState(() => window.location.hash.substring(1))
  
  // Create a memoized update function
  const updateCurrentPath = useCallback(() => {
    setCurrentPath(window.location.hash.substring(1))
  }, [])
  
  // Check if we're on a dashboard page
  const isDashboardPage = currentPath.includes('/dao/')
  
  // Get the title based on current route
  const getPageTitle = () => {
    if (isDashboardPage) {
      return "DAO Dashboard"
    } else if (currentPath.includes('/explorer')) {
      return "Explorer"
    } else if (currentPath.includes('/profile')) {
      return "Profile"
    } else if (currentPath.includes('/trends')) {
      return "Trends"
    } else if (currentPath.includes('/digest')) {
      return "Digest"
    } else {
      return "Dashboard"
    }
  }

  // Update the current path when location changes
  useEffect(() => {
    // Set initial path (in case it wasn't set in useState)
    updateCurrentPath()
    
    // Add event listener for hash changes
    window.addEventListener('hashchange', updateCurrentPath)

    // Clean up event listener
    return () => {
      window.removeEventListener('hashchange', updateCurrentPath)
    }
  }, [updateCurrentPath])

  // Force a re-render when navigating
  useEffect(() => {
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    // Override pushState
    window.history.pushState = function() {
      originalPushState.apply(this, arguments as any)
      updateCurrentPath()
    }

    // Override replaceState
    window.history.replaceState = function() {
      originalReplaceState.apply(this, arguments as any)
      updateCurrentPath()
    }

    // Restore original functions on cleanup
    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [updateCurrentPath])

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          {isDashboardPage ? (
            <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="-ml-1" 
              onClick={() => navigate('/explorer')}
              title="Back to Explorer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            </>
          ) : (
            <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
            </>
          )}
          <h1 className="text-base font-medium">{getPageTitle()}</h1>
        </div>
        
        <ThemeToggle />
      </div>
    </header>
  )
}
