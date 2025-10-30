import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Frame,
  GalleryVerticalEnd,
  Telescope,
  TrendingUpDown,
  SettingsIcon,
  HelpCircleIcon,
  SearchIcon,
  Mountain,
} from "lucide-react"
import {
  SidebarMenuButton,
} from "@/components/ui/sidebar"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavLink } from "react-router"
import { useAccount } from "wagmi"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "",
      logo: GalleryVerticalEnd,
      plan: "Snapshot",
    },
    {
      name: "Aave",
      logo: AudioWaveform,
      plan: "Snapshot",
    },
  ],
  navMain: [
    {
      title: "Explorer",
      url: "/explorer",
      icon: Telescope,
      isActive: false,
    },
    {
      title: "Digests",
      url: "/digest",
      icon: BookOpen,
    },
    {
      title: "Trends",
      url: "/trends",
      icon: TrendingUpDown,
    },
    // {
    //   title: "KnowledgeBase",
    //   url: "#",
    //   icon: Library,
    // },
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: Settings2,
    //   items: [
    //     {
    //       title: "General",
    //       url: "#",
    //     },
    //     {
    //       title: "Team",
    //       url: "#",
    //     },
    //     {
    //       title: "Billing",
    //       url: "#",
    //     },
    //     {
    //       title: "Limits",
    //       url: "#",
    //     },
    //   ],
    // },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
  projects: [
    {
      name: "Arbitrum DAO",
      url: "#",
      icon: Frame,
    },
    {
      name: "Aave",
      url: "#",
      icon: Frame,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const account = useAccount()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        > 
          {/* <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"> */}
          <NavLink to="/explorer">
            <Mountain className="size-8" />
            </NavLink>
          {/* </div> */}
          <div className="grid flex-1 text-left text-2xl leading-tight">
          <NavLink to="/explorer">
            <span className="truncate font-semibold">Davos</span>
            {/* <span className="truncate text-xs">{activeTeam.plan}</span> */}
            </NavLink>
          </div>
          
          {/* <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" /> */}
              
        </SidebarMenuButton>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* Only show Actions column if account is connected */}
        {account.address ? (
          <NavProjects projects={data.projects} />
        ): null}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
