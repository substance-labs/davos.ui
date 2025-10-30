"use client"

import { type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavLink } from "react-router"
import { useSubscriptions } from "@/contexts/subscriptions"
import { DaoConfigItem, getDaoByIdentifier } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useCallback, useEffect, useState } from "react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { 
      isSubscribed,
      subscriptions: _subscriptions
    } = useSubscriptions();
  const [currentPath, setCurrentPath] = useState(() => window.location.hash.substring(1))
  const [dao, setDao] = useState<DaoConfigItem>()

  const updateCurrentPath = useCallback(() => {
    setCurrentPath(window.location.hash.substring(1))
  }, [])

  useEffect(() => {
    const daoIdentifier = (() => {
      const path = window.location.hash;
      const match = path.match(/#\/dao\/([^/]+)/);
      return match ? match[1] : "";
    })();
    setDao(getDaoByIdentifier(daoIdentifier))
  }, [currentPath])

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
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className={cn(
              "group/collapsible",
              // Highlight Explorer
              (item.title === "Explorer" && (
                currentPath.includes('/explorer') || 
                (currentPath.includes('/dao') && dao && !isSubscribed(dao))
              )) && "bg-sidebar-accent text-sidebar-accent-foreground",
              // Highlight Digest when on digest page
              (item.title === "Digest" && currentPath.includes('/digest')) && 
                "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                    {/* <button href="dashboard" className="flex items-center"> */}
                    {item.title === "Digest" ? (
                      <NavLink to="/digest/overview">
                        {item.title}
                      </NavLink>
                    ) : (
                      <NavLink to={item.url}>
                        {item.title}
                      </NavLink>
                    )}
                  {/* <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" /> */}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {/* <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url}>
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent> */}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
