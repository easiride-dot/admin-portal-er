import { useState, useEffect } from "react";
import { 
  Search, 
  MessageCircle, 
  MoreVertical, 
  Trash2, 
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { openWhatsApp } from "@/lib/whatsapp";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/logging";

export const Students = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          rides (
            pickup,
            destination,
            type,
            time_slot,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const studentsWithPreviewUrls = await Promise.all(
        (data || []).map(async (student) => {
          const studentIdPreview = await resolveStudentIdPreviewUrl(student.id, student.student_id_url);
          return {
            ...student,
            student_id_preview_url: studentIdPreview,
          };
        })
      );
      setStudents(studentsWithPreviewUrls);
    } catch (error) {
      toast.error("Failed to fetch students");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleVerify = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ verification_status: status })
        .eq("id", id)
        .select("id, verification_status")
        .single();

      if (error) throw error;

      if (!data || data.verification_status !== status) {
        throw new Error("Profile verification update did not persist");
      }

      await logAdminAction(status === 'approved' ? "approve_student" : "reject_student", id, { status });
      setStudents((prev) =>
        prev.map((student) =>
          student.id === id ? { ...student, verification_status: status } : student
        )
      );
      setSelectedStudent((prev) =>
        prev && prev.id === id ? { ...prev, verification_status: status } : prev
      );
      toast.success(`Student ${status}`);
      await fetchStudents();
      setSelectedStudent(null);
    } catch (error) {
      toast.error("Update failed");
      console.error(error);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = (s.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (s.phone || "").includes(search);
    
    const matchesStatus = filterStatus === "all" || s.verification_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      toast.error("Deletion failed");
    } else {
      toast.success("Student deleted");
      fetchStudents();
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Students Management</h1>
          <p className="text-muted-foreground mt-1">Verify student IDs and manage profiles.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="bg-secondary/50 border border-hairline rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-primary/20"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Verification</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <Button variant="outline" className="rounded-xl" onClick={fetchStudents}>
          Refresh
        </Button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">ID Photo</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Latest Trip</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/40 text-sm">
              {filteredStudents.map((student) => {
                const latestRide = student.rides?.[0];
                return (
                  <tr key={student.id} className="group hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{student.full_name || "Unknown"}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{student.campus || "No Campus"}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {student.phone || "No phone"}
                    </td>
                    <td className="px-6 py-4">
                      {student.student_id_url ? (
                        <div 
                          className="h-10 w-16 rounded-lg bg-secondary/50 border border-hairline overflow-hidden cursor-pointer hover:ring-2 ring-primary/20 transition-all"
                          onClick={() => setSelectedStudent(student)}
                        >
                          <img 
                            src={student.student_id_preview_url || student.student_id_url} 
                            alt="ID Thumbnail" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-16 rounded-lg bg-secondary/20 border border-dashed border-hairline flex items-center justify-center">
                          <ShieldAlert className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <VerificationBadge status={student.verification_status} />
                        {student.student_id_url && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2 text-[10px] uppercase font-bold tracking-wider hover:bg-primary/5 text-primary"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {latestRide ? (
                        <div>
                          <div className="truncate max-w-[120px] font-medium">{latestRide.pickup}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-tight">{latestRide.status}</div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">No rides yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => openWhatsApp(student.phone || "", `Hello ${student.full_name}, I'm checking in regarding your Easi Ride registration.`)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            {student.verification_status !== 'approved' && (
                              <DropdownMenuItem className="gap-2 text-emerald-600" onClick={() => handleVerify(student.id, 'approved')}>
                                <CheckCircle2 className="h-4 w-4" /> Approve ID
                              </DropdownMenuItem>
                            )}
                            {student.verification_status !== 'rejected' && (
                              <DropdownMenuItem className="gap-2 text-amber-600" onClick={() => handleVerify(student.id, 'rejected')}>
                                <XCircle className="h-4 w-4" /> Reject ID
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleDelete(student.id)}>
                              <Trash2 className="h-4 w-4" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
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
                  src={selectedStudent.student_id_preview_url || selectedStudent.student_id_url} 
                  alt="Student ID" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const msg = document.createElement('div');
                      msg.className = 'text-center p-10';
                      msg.innerHTML = '<div class="text-destructive mb-2 font-semibold">Image failed to load</div><div class="text-xs text-muted-foreground">The link may have expired or permissions are restricted.</div>';
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
            
            <div className="mt-6 flex gap-3">
              <Button 
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleVerify(selectedStudent.id, 'approved')}
              >
                Approve Student
              </Button>
              <Button 
                variant="outline"
                className="flex-1 rounded-xl text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => handleVerify(selectedStudent.id, 'rejected')}
              >
                Reject ID
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const resolveStudentIdPreviewUrl = async (studentId: string, studentIdUrl?: string | null) => {
  const currentPath = studentIdUrl ? getStudentIdPath(studentIdUrl) : null;
  const candidatePaths = currentPath ? [currentPath] : [];

  if (!currentPath) {
    const latestPath = await findLatestStudentIdPath(studentId);
    if (latestPath) {
      candidatePaths.push(latestPath);
    }
  }

  for (const path of candidatePaths) {
    if (await fileExists(path)) {
      const signedUrl = await getSignedStudentIdUrl(path);
      if (signedUrl) return signedUrl;
    }
  }

  const latestPath = await findLatestStudentIdPath(studentId);
  if (latestPath) {
    const signedUrl = await getSignedStudentIdUrl(latestPath);
    if (signedUrl) return signedUrl;
  }

  return studentIdUrl ?? null;
};

const getStudentIdPath = (studentIdUrl: string) => {
  const marker = "/student-ids/";
  const markerIndex = studentIdUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const pathWithQuery = studentIdUrl.slice(markerIndex + marker.length);
  const [path] = pathWithQuery.split("?");
  return decodeURIComponent(path);
};

const findLatestStudentIdPath = async (studentId: string) => {
  const { data, error } = await supabase.storage
    .from("student-ids")
    .list(studentId, {
      limit: 20,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    console.error("Could not list student ID files:", error);
    return null;
  }

  const latestFile = data?.find((item) => item.name);
  if (!latestFile) return null;

  return `${studentId}/${latestFile.name}`;
};

const fileExists = async (path: string) => {
  const { data, error } = await supabase.storage
    .from("student-ids")
    .list(getFolderName(path), {
      search: getFileName(path),
      limit: 1,
    });

  if (error) {
    console.error("Could not verify student ID file:", error);
    return false;
  }

  return !!data?.some((item) => item.name === getFileName(path));
};

const getSignedStudentIdUrl = async (path: string) => {
  const { data, error } = await supabase.storage
    .from("student-ids")
    .createSignedUrl(path, 60 * 15); // Valid for 15 minutes

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
  return data?.signedUrl || null;
};

const getFolderName = (path: string) => {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? "" : path.slice(0, lastSlash);
};

const getFileName = (path: string) => {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? path : path.slice(lastSlash + 1);
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
    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ring-1 flex items-center gap-1.5 ${config.color}`}>
      <Icon className="h-3 w-3" /> {config.label}
    </span>
  );
};
