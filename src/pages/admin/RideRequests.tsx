import { useState, useEffect } from "react";
import { 
  supabase 
} from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  CarFront,
  AlertCircle,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion
} from "lucide-react";
import { logAdminAction } from "@/lib/logging";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const RideRequests = () => {
  const [rides, setRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedStudentPreviewUrl, setSelectedStudentPreviewUrl] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ridesRes, driversRes] = await Promise.all([
        supabase
          .from("rides")
          .select(`*, profiles(full_name, phone, verification_status, student_id_url)`)
          .order("created_at", { ascending: false }),
        supabase
          .from("drivers")
          .select("*")
          .eq("status", "active")
      ]);

      if (ridesRes.error) throw ridesRes.error;
      if (driversRes.error) throw driversRes.error;

      // Fetch ride participants separately
      const ridesWithParticipants = await Promise.all(
        (ridesRes.data || []).map(async (ride) => {
          const { data: participants, error } = await supabase
            .from("ride_participants" as any)
            .select("id, user_id, payment_status")
            .eq("ride_id", ride.id);
          
          if (error) {
            console.error("Error fetching participants for ride", ride.id, error);
            return { ...ride, ride_participants: [] };
          }
          
          return { ...ride, ride_participants: participants || [] };
        })
      );

      setRides(ridesWithParticipants);
      setDrivers(driversRes.data || []);
    } catch (error) {
      toast.error("Failed to load requests");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("ride_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAssign = async (rideId: string, driverId: string) => {
    if (!driverId) return;
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;

    try {

      // Check if current user has admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (roleError || !roleData) {
        console.error("Admin role check failed:", roleError);
        toast.error("You don't have admin privileges to assign drivers");
        return;
      }

      const { error } = await supabase
        .from("rides")
        .update({
          status: "pending_driver_acceptance",
          driver_id: driverId,
          driver_name: driver.full_name,
          driver_phone: driver.phone,
          vehicle: driver.vehicle,
        })
        .eq("id", rideId);

      if (error) {
        console.error("Update error:", error);
        toast.error(`Assignment failed: ${error.message}`);
        return;
      }

      await logAdminAction("assign_driver", rideId, { driver_id: driverId, driver_name: driver.full_name });
      toast.success(`Awaiting ${driver.full_name}'s response`);

      fetchData();
    } catch (error: any) {
      console.error("Assignment error:", error);
      toast.error(`Assignment failed: ${error?.message || 'Unknown error'}`);
    }
  };

  const updateStatus = async (rideId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("rides")
        .update({ status: status as any })
        .eq("id", rideId);

      if (error) throw error;
      
      await logAdminAction("update_status", rideId, { status });
      toast.success(`Ride marked as ${status.replace("_", " ")}`);
      fetchData();
    } catch (error) {
      toast.error("Status update failed");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Ride Requests</h1>
        <p className="text-muted-foreground mt-1">Manage and assign incoming student ride requests in real-time.</p>
      </div>

      <div className="grid gap-4">
        {rides.map((ride) => (
          <div 
            key={ride.id} 
            className={`glass-card rounded-3xl overflow-hidden border-l-4 transition-all hover:shadow-elevated ${
              ride.status === 'pending' || ride.status === 'pending_friend_commitment' ? 'border-amber-400' :
              ride.status === 'pending_driver_acceptance' ? 'border-orange-400' :
              ride.status === 'driver_assigned' ? 'border-blue-400' :
              ride.status === 'in_progress' ? 'border-purple-400' :
              'border-emerald-400'
            }`}
          >
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center relative">
                      <User className="h-5 w-5 text-muted-foreground" />
                      {ride.profiles?.verification_status === 'approved' && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-background">
                          <ShieldCheck className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-lg">{ride.profiles?.full_name || "Student"}</div>
                        <VerificationBadge status={ride.profiles?.verification_status} />
                        {ride.profiles?.student_id_url && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 px-2 text-[9px] uppercase font-bold tracking-wider hover:bg-primary/5"
                            onClick={async () => {
                              setSelectedStudent(ride.profiles);
                              if (ride.profiles?.student_id_url) {
                                const signedUrl = await resolveStudentIdPreviewUrl(ride.profiles.student_id_url);
                                setSelectedStudentPreviewUrl(signedUrl);
                              }
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" /> ID
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Requested at {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-amber-500" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pickup</div>
                        <div className="text-sm font-medium">{ride.pickup}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-emerald-500" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Destination</div>
                        <div className="text-sm font-medium">{ride.destination}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[150px]">
                  <StatusBadge status={ride.status} />
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Type & Slot</div>
                    <div className="text-sm font-semibold capitalize">{ride.type} • {ride.time_slot}</div>
                  </div>
                  {ride.type === 'shared' && (
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Seats Claimed</div>
                      <div className="text-sm font-semibold">
                        {ride.seats_claimed ?? 0} / 2
                      </div>
                      {ride.ride_participants && ride.ride_participants.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {ride.ride_participants.map((participant: any) => (
                            <div key={participant.id} className="text-xs flex items-center justify-end gap-1">
                              <span className={`text-[8px] uppercase font-extrabold px-1 py-0.5 rounded-full ${
                                participant.payment_status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {participant.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Fare / Payment</div>
                    <div className="text-sm font-semibold">
                      {ride.price === 0 || ride.payment_type === 'subscription' ? (
                        <span className="text-emerald-600 font-semibold text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/20">
                          Subscription (0 NLe)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 justify-end">
                          <span className="text-foreground">{ride.price ?? "?"} NLe</span>
                          <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full ring-1 ${
                            ride.payment_status === 'paid' 
                              ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-500 ring-amber-500/20'
                          }`}>
                            {ride.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-hairline/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {ride.status === 'pending' || ride.status === 'pending_friend_commitment' || ride.status === 'pool_locked_awaiting_driver' ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="bg-secondary/50 border border-hairline rounded-xl px-4 py-2 text-sm outline-none"
                        onChange={(e) => handleAssign(ride.id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Choose Driver...</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.full_name} ({d.vehicle})</option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" className="text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mr-2" /> Pending
                      </Button>
                    </div>
                  ) : ride.status === 'pending_driver_acceptance' ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">Awaiting driver...</span>
                        <span className="ml-1 font-bold">{ride.driver_name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <CarFront className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">Assigned to:</span>
                        <span className="ml-1 font-bold">{ride.driver_name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {ride.status === 'driver_assigned' && (
                    <Button
                      size="sm"
                      className="rounded-xl bg-purple-600 hover:bg-purple-700"
                      onClick={() => updateStatus(ride.id, "in_progress")}
                    >
                      Start Trip
                    </Button>
                  )}
                  {ride.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => updateStatus(ride.id, "completed")}
                    >
                      Mark Completed
                    </Button>
                  )}
                  {ride.status === 'completed' && (
                    <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Finalized
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {rides.length === 0 && !loading && (
          <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground">
            No ride requests found.
          </div>
        )}
      </div>

      <Dialog 
        open={!!selectedStudent} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStudent(null);
            setSelectedStudentPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl overflow-hidden p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{selectedStudent?.full_name}'s Student ID</DialogTitle>
            <DialogDescription>
              Verify the student ID card details below.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-2">
            <div className="aspect-[1.6/1] bg-secondary/30 rounded-2xl overflow-hidden border-hairline border flex items-center justify-center relative">
              {selectedStudent?.student_id_url ? (
                <img 
                  src={selectedStudentPreviewUrl || selectedStudent.student_id_url} 
                  alt="Student ID" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const msg = document.createElement('div');
                      msg.className = 'text-center p-10';
                      msg.innerHTML = '<div class="text-destructive mb-2 font-semibold">Image failed to load</div><div class="text-xs text-muted-foreground">The link might be broken or the file was deleted from storage.</div>';
                      parent.appendChild(msg);
                    }
                  }}
                />
              ) : (
                <div className="text-center p-10">
                  <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground font-medium">No ID photo uploaded</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const VerificationBadge = ({ status }: { status: string }) => {
  const configs: Record<string, any> = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700 ring-amber-200", icon: ShieldQuestion },
    approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 ring-emerald-200", icon: ShieldCheck },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700 ring-red-200", icon: ShieldAlert },
  };
  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ring-1 flex items-center gap-1 ${config.color}`}>
      <Icon className="h-2.5 w-2.5" /> {config.label}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const labels: Record<string, string> = {
    pending: "Pending",
    pending_friend_commitment: "Friend Pending",
    pool_locked_awaiting_driver: "Pool Locked",
    pending_driver_acceptance: "Awaiting Driver",
    driver_assigned: "Driver Assigned",
    in_progress: "In Progress",
    completed: "Completed",
  };
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 ring-amber-200",
    pending_friend_commitment: "bg-amber-100 text-amber-700 ring-amber-200",
    pool_locked_awaiting_driver: "bg-amber-100 text-amber-700 ring-amber-200",
    pending_driver_acceptance: "bg-orange-100 text-orange-700 ring-orange-200",
    driver_assigned: "bg-blue-100 text-blue-700 ring-blue-200",
    in_progress: "bg-purple-100 text-purple-700 ring-purple-200",
    completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };
  return (
    <span className={`text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1.5 rounded-full ring-1 ${colors[status] || "bg-secondary"}`}>
      {labels[status] || status.replace("_", " ")}
    </span>
  );
};

const resolveStudentIdPreviewUrl = async (studentIdUrl?: string | null) => {
  if (!studentIdUrl) return null;
  const marker = "/student-ids/";
  const markerIndex = studentIdUrl.indexOf(marker);
  if (markerIndex === -1) return studentIdUrl;

  const pathWithQuery = studentIdUrl.slice(markerIndex + marker.length);
  const [path] = pathWithQuery.split("?");
  const decodedPath = decodeURIComponent(path);

  const { data, error } = await supabase.storage
    .from("student-ids")
    .createSignedUrl(decodedPath, 60 * 15); // Valid for 15 minutes

  if (error) {
    console.error("Error creating signed URL:", error);
    return studentIdUrl;
  }
  return data?.signedUrl || studentIdUrl;
};
