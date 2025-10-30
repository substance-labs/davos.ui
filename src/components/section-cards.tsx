import { DaoCard } from "./dao-card"
import { daoConfig } from "@/lib/constants"

export function SectionCards() {
  const gridContainerClasses = 
    "grid grid-cols-1 gap-4 px-4 lg:px-6 @2xl/main:grid-cols-2 @6xl/main:grid-cols-3 @7xl/main:grid-cols-4";

  return (
    <div className={`${gridContainerClasses} *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs`}>
      {Object.entries(daoConfig).map(([key, dao]) => (
        <DaoCard 
          key={key}
          dao={dao}
          logo={dao.logo}
        />
      ))}
    </div>
  )
}
