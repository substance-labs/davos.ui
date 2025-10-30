"use client"

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import {
  CardContent,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"

const chartConfig = {
  visitors: {
    label: "Active Users",
  },
  safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function ChartEngagement({medianTimePerProposal, angle}: any) {
    const chartData = [
        { browser: "safari", visitors: medianTimePerProposal, fill: "var(--color-safari)" },
      ]
  return (
    <CardContent className="flex-1 pb-0">
        <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px]"
        >
            <RadialBarChart
                data={chartData}
                endAngle={angle}
                innerRadius={80}
                outerRadius={140}
            >
                <PolarGrid
                    gridType="circle"
                    radialLines={false}
                    stroke="none"
                    className="first:fill-muted last:fill-background"
                    polarRadius={[86, 74]}
                />
                <RadialBar dataKey="visitors" background />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                    content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                            <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            >
                            <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-4xl font-bold"
                            >
                                {chartData[0].visitors.toLocaleString()}
                            </tspan>
                            <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                            >
                                Mins per proposal
                            </tspan>
                            </text>
                        )
                        }
                    }}
                    />
                </PolarRadiusAxis>
            </RadialBarChart>
        </ChartContainer>
    </CardContent>
  )
}
