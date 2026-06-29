import React from "react";
import { formatNaira } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DashboardStatCardProps {
  label: string;
  value: string | number | undefined;
  icon: LucideIcon;
  subtitle: string;
  valueColor?: "default" | "green" | "amber";
  isPercentage?: boolean;
}

const colorMap = {
  default: "text-neutral-900",
  green: "text-green-600",
  amber: "text-amber-600",
};

const iconColorMap = {
  default: "text-neutral-400",
  green: "text-green-500",
  amber: "text-amber-500",
};

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  valueColor = "default",
  isPercentage = false,
}: DashboardStatCardProps) {
  const displayValue = isPercentage
    ? `${value ?? 0}%`
    : typeof value === "number"
      ? value.toLocaleString()
      : formatNaira(value ?? 0);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-label-medium text-neutral-500 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <Icon className={`w-5 h-5 ${iconColorMap[valueColor]}`} />
      </div>
      <div className="space-y-1">
        <div
          className={`text-headline-small font-extrabold ${colorMap[valueColor]} tabular-nums`}
        >
          {displayValue}
        </div>
        <p className="text-[11px] text-neutral-400">{subtitle}</p>
      </div>
    </div>
  );
}

export function DashboardStatCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-3 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-3 w-28 bg-neutral-200 rounded" />
        <div className="w-5 h-5 bg-neutral-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-8 w-36 bg-neutral-200 rounded" />
        <div className="h-3 w-40 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}
