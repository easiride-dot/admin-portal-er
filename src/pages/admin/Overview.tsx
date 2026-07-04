import { useState, useEffect } from "react";
import { 
  Users, 
  CarFront, 
  ListChecks, 
  TrendingUp, 
  Plus,
  ArrowUpRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const Dashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    activeDrivers: 0,
    pendingRides: 0,
    completedToday: 0,
    weeklyRevenue: 0
  });
  const [recentRides, setRecentRides] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const [
        { count: studentsCount },
        { count: driversCount },
        { count: pendingCount },
        { data: todayRides },
        { data: weeklyRides },
        { data: recentRidesData }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("drivers").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("rides").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("rides").select("price").eq("status", "completed").gte("created_at", today.toISOString()),
        supabase.from("rides").select("price").eq("status", "completed").gte("created_at", lastWeek.toISOString()),
        supabase.from("rides").select("*").order("created_at", { ascending: false }).limit(5)
      ]);

      const revenue = weeklyRides?.reduce((sum, r) => sum + r.price, 0) || 0;

      setStats({
        students: studentsCount || 0,
        activeDrivers: driversCount || 0,
        pendingRides: pendingCount || 0,
        completedToday: todayRides?.length || 0,
        weeklyRevenue: revenue
      });

      setRecentRides(recentRidesData || []);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase
      .channel("dashboard_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => fetchDashboardData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back, Admin. Here is what's happening today.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/requests">
            <Button className="rounded-xl shadow-soft">
              <Plus className="mr-2 h-4 w-4" /> Assign Ride
            </Button>
          </Link>
          <Link to="/drivers">
            <Button variant="outline" className="rounded-xl shadow-soft">
              <CarFront className="mr-2 h-4 w-4" /> Add Driver
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Students" value={stats.students} icon={Users} trend="+12%" />
        <StatCard label="Active Drivers" value={stats.activeDrivers} icon={CarFront} />
        <StatCard label="Pending Requests" value={stats.pendingRides} icon={ListChecks} color="text-amber-600 bg-amber-50" />
        <StatCard label="Completed (Today)" value={stats.completedToday} icon={TrendingUp} color="text-emerald-600 bg-emerald-50" />
        <StatCard label="Daily Revenue" value={`NLe ${stats.weeklyRevenue}`} icon={ArrowUpRight} />
      </div>

      <div className="glass-card rounded-3xl overflow-hidden shadow-elevated">
        <div className="border-b border-hairline/60 px-6 py-5">
          <h2 className="font-display text-lg font-semibold">Recent Ride Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Pickup</th>
                <th className="px-6 py-3 font-medium">Destination</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/40">
              {recentRides.map((ride) => (
                <tr key={ride.id} className="group hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{ride.pickup}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{ride.destination}</td>
                  <td className="px-6 py-4">
                    <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/60">
                      {ride.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={ride.status} />
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                    {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {recentRides.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
  <div className="glass-card rounded-3xl p-6 shadow-soft hover:shadow-elevated transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("p-2 rounded-xl bg-secondary/50", color)}>
        <Icon className="h-5 w-5" />
      </div>
      {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg">{trend}</span>}
    </div>
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
    <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</h3>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    assigned: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={cn("text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full", colors[status] || "bg-secondary text-muted-foreground")}>
      {status.replace("_", " ")}
    </span>
  );
};
