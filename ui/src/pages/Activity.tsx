import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { activityApi } from "../api/activity";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { ActivityRow } from "../components/ActivityRow";
import { PageSkeleton } from "../components/PageSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History } from "lucide-react";
import type { ActivityEvent } from "@paperclipai/shared";

function groupActivitiesByDate(activities: ActivityEvent[]) {
  const groups: Record<string, ActivityEvent[]> = {};
  for (const activity of activities) {
    const date = new Date(activity.createdAt);
    const dateKey = date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(activity);
  }
  return Object.entries(groups);
}

export function Activity() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setBreadcrumbs([{ label: "Activity" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.activity(selectedCompanyId!, { type: filter }),
    queryFn: () => activityApi.list(selectedCompanyId!, {
      entityType: filter === "all" ? undefined : filter,
      limit: 100,
    }),
    enabled: !!selectedCompanyId,
  });

  const grouped = useMemo(() => {
    if (!data) return [];
    return groupActivitiesByDate(data);
  }, [data]);

  const entityTypes = useMemo(() => {
    if (!data && filter === "all") return [];
    // If we have a filter, we might not see other types in the current batch.
    // Ideally the backend should provide available types or we have a static list.
    return ["issue", "agent", "project", "goal", "approval", "routine", "cost", "heartbeat_run"];
  }, [data, filter]);

  if (!selectedCompanyId) {
    return <EmptyState icon={History} message="Select a company to view activity." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Recent Activity</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {data && data.length === 0 && (
        <EmptyState icon={History} message="No activity yet." />
      )}

      {grouped.map(([date, activities]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold px-1">
            {date}
          </h3>
          <div className="border border-border divide-y divide-border bg-card">
            {activities.map((event) => (
              <ActivityRow
                key={event.id}
                event={event}
                agentMap={new Map()} // Enriched data in event means we don't need these maps
                entityNameMap={new Map()}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
