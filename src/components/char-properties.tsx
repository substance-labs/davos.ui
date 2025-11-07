'use client';

// import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { PolarGrid, RadialBar, RadialBarChart } from 'recharts';

import { CardContent } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  visitors: {
    label: 'Visitors',
  },
  chrome: {
    label: 'Active Voting Weight',
    color: 'hsl(var(--chart-1))',
  },
  safari: {
    label: 'Active Voters %',
    color: 'hsl(var(--chart-2))',
  },
  edge: {
    label: 'Activity Score',
    color: 'hsl(var(--chart-4))',
  },
  other: {
    label: 'Participation Effort Score',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

export interface ChartPropsData {
  users: number;
  proposals: number;
  totalTime: number;
  timePerDay: number;
  votes: number;
}

export function ChartProps({ users, proposals, timePerDay, votes }: ChartPropsData) {
  // const chartData = [
  //   { month: "Users", desktop: users },
  //   { month: "Proposals", desktop: proposals },
  //   { month: "Total Time", desktop: totalTime },
  //   { month: "Time per day", desktop: timePerDay },
  //   { month: "Votes", desktop: votes },
  // ]

  const chartData = [
    { browser: 'chrome', visitors: users, fill: '#8884d8' },
    { browser: 'safari', visitors: proposals, fill: '#82ca9d' },
    // { browser: "firefox", visitors: totalTime, fill: "var(--color-firefox)" },
    { browser: 'edge', visitors: timePerDay, fill: '#ffc658' },
    { browser: 'other', visitors: votes, fill: '#ff7300' },
  ];

  return (
    <CardContent className="flex-1 pb-0">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
        {/* <RadarChart data={chartData}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarAngleAxis 
          dataKey="month" 
          tick={({ x, y, payload }) => {
            const icons = {
              "Users": <Users size={16} />,
              "Proposals": <ScrollText size={16} />,
              "Total Time": <Timer size={16} />,
              "Time per day": <CalendarX size={16} />,
              "Votes": <Vote size={16} />,
            };
                  
            return (
              <g transform={`translate(${x},${y})`}>
                <foreignObject 
                  width={20} 
                  height={20} 
                  x={-7} 
                  y={-7}
                  style={{ textAlign: 'center' }}
                >
                  {icons[payload.value] || payload.value}
                </foreignObject>
              </g>
            );
          }} 
        />
        <PolarGrid />
        <Radar
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0.6}
        />
      </RadarChart> */}
        <RadialBarChart data={chartData} innerRadius={20} outerRadius={100}>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="browser" />}
          />
          <PolarGrid gridType="circle" />
          <RadialBar dataKey="visitors" />
        </RadialBarChart>
      </ChartContainer>
    </CardContent>
  );
}
