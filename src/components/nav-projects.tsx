import { Forward, Plus, type LucideIcon, Cpu } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from 'react-router';
import { useSubscriptions } from '@/contexts/subscriptions';
import { useCallback, useEffect, useState } from 'react';
import { useAgents } from '@/contexts/AgentContext';

export function NavProjects({
  projects: _projects, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const { isMobile: _isMobile } = useSidebar(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const { subscriptions } = useSubscriptions();
  const [currentPath, setCurrentPath] = useState(() => window.location.hash.substring(1));
  const { hasAgent, agents } = useAgents();

  // Get unique DAOs from both subscriptions and agents
  const mergedDAOs = useCallback(() => {
    const daoMap = new Map();

    // Add subscriptions to the map
    subscriptions.forEach(sub => {
      daoMap.set(sub.dao.identifier, sub.dao);
    });

    // Add agents' DAOs to the map (this won't create duplicates due to Map's unique keys)
    if (agents) {
      agents.forEach(agent => {
        if (agent.dao && !daoMap.has(agent.dao.identifier)) {
          daoMap.set(agent.dao.identifier, agent.dao);
        }
      });
    }

    // Convert to array and sort alphabetically by name
    return Array.from(daoMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [subscriptions, agents]);

  // Get the merged unique DAOs
  const activeOrWatchedDAOs = mergedDAOs();

  // Create a memoized update function
  const updateCurrentPath = useCallback(() => {
    setCurrentPath(window.location.hash.substring(1));
  }, []);

  // Update the current path when location changes
  useEffect(() => {
    // Set initial path (in case it wasn't set in useState)
    updateCurrentPath();

    // Add event listener for hash changes
    window.addEventListener('hashchange', updateCurrentPath);

    // Clean up event listener
    return () => {
      window.removeEventListener('hashchange', updateCurrentPath);
    };
  }, [updateCurrentPath]);

  // Force a re-render when navigating
  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    // Override pushState
    window.history.pushState = function (...args: Parameters<typeof originalPushState>) {
      originalPushState.apply(this, args);
      updateCurrentPath();
    };

    // Override replaceState
    window.history.replaceState = function (...args: Parameters<typeof originalReplaceState>) {
      originalReplaceState.apply(this, args);
      updateCurrentPath();
    };

    // Restore original functions on cleanup
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [updateCurrentPath]);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Watchlist</SidebarGroupLabel>
      <SidebarMenu>
        {activeOrWatchedDAOs.map(item => {
          const targetPath = `/dao/${item.identifier}`;
          const isActive = currentPath === targetPath;
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <NavLink
                  key={item.identifier}
                  to={`/dao/${item.identifier}`}
                  className={isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
                >
                  {item.logo ? (
                    <img src={item.logo} className="h-4 w-4 rounded-full" />
                  ) : (
                    <Forward />
                  )}
                  <span>{item.name}</span>
                  {hasAgent(item) && <Cpu className="text-sidebar-foreground/70" />}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <Plus className="text-sidebar-foreground/70" />
            <NavLink to="/explorer">
              <span>Add</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
