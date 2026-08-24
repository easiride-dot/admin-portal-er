import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ApprovalFilter = "all" | "pending" | "approved" | "rejected" | "suspended";
export type DriverStatusFilter = "all" | "online" | "offline" | "busy";
export type CodeFilter = "all" | "generated" | "not_generated";
export type SortKey = "newest" | "oldest" | "name_asc" | "name_desc";

export interface FilterState {
  search: string;
  approval: ApprovalFilter;
  driverStatus: DriverStatusFilter;
  code: CodeFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  approval: "all",
  driverStatus: "all",
  code: "all",
  sort: "newest",
};

interface FiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export const Filters = ({ filters, onChange }: FiltersProps) => {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search name, phone, code, plate…"
          className="pl-9"
          aria-label="Search drivers"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:items-center">
        <Select
          value={filters.approval}
          onValueChange={(v) => set("approval", v as ApprovalFilter)}
        >
          <SelectTrigger className="w-full lg:w-36" aria-label="Filter by approval status">
            <SelectValue placeholder="Approval" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All approvals</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.driverStatus}
          onValueChange={(v) => set("driverStatus", v as DriverStatusFilter)}
        >
          <SelectTrigger className="w-full lg:w-36" aria-label="Filter by driver status">
            <SelectValue placeholder="Driver status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.code} onValueChange={(v) => set("code", v as CodeFilter)}>
          <SelectTrigger className="w-full lg:w-36" aria-label="Filter by driver code">
            <SelectValue placeholder="Driver code" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All codes</SelectItem>
            <SelectItem value="generated">Code generated</SelectItem>
            <SelectItem value="not_generated">Code not generated</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sort} onValueChange={(v) => set("sort", v as SortKey)}>
          <SelectTrigger className="w-full lg:w-36" aria-label="Sort drivers">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name_asc">Name A–Z</SelectItem>
            <SelectItem value="name_desc">Name Z–A</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};