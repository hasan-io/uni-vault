import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "blue" | "indigo" | "emerald" | "amber";
}

const iconBgColors = {
  blue: "bg-primary/10",
  indigo: "bg-secondary/10",
  emerald: "bg-success/10",
  amber: "bg-warning/10",
};

const iconColors = {
  blue: "text-primary",
  indigo: "text-secondary",
  emerald: "text-success",
  amber: "text-warning",
};

const topBorderColors = {
  blue: "border-t-primary",
  indigo: "border-t-secondary",
  emerald: "border-t-success",
  amber: "border-t-warning",
};

export default function StatCard({ title, value, icon: Icon, description, variant = "blue" }: StatCardProps) {
  return (
    <div className={`glass rounded-2xl border-t-[3px] ${topBorderColors[variant]} p-5 animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-[32px] font-display font-bold text-foreground mt-1 leading-tight">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${iconBgColors[variant]}`}>
          <Icon className={`w-5 h-5 ${iconColors[variant]}`} />
        </div>
      </div>
    </div>
  );
}
