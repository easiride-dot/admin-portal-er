import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Search,
  Filter,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/logging";

export const Payments = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`*, profiles(full_name, phone)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      toast.error("Failed to load subscriptions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const updatePaymentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ payment_status: status as any })
        .eq("id", id);

      if (error) throw error;
      
      await logAdminAction("update_payment", id, { status });
      toast.success(`Payment status marked as ${status}`);
      fetchSubscriptions();
    } catch (error) {
      toast.error("Update failed");
      console.error(error);
    }
  };

  const filtered = subscriptions.filter(s => 
    (s.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.plan_type || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Payments & Subscriptions</h1>
        <p className="text-muted-foreground mt-1">Track student payments and manage plan validity.</p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by student or plan..." 
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-xl" onClick={fetchSubscriptions}>
          Refresh
        </Button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Plan Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Expiry Date</th>
                <th className="px-6 py-4 font-medium text-right">Payment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/40 text-sm">
              {filtered.map((sub) => {
                const isExpired = new Date(sub.end_date) < new Date();
                const isPaid = sub.payment_status === 'paid';

                return (
                  <tr key={sub.id} className="group hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{sub.profiles?.full_name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{sub.profiles?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize font-medium">{sub.plan_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isPaid ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase tracking-wider">
                          <XCircle className="h-3.5 w-3.5" /> Pending
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className={`h-4 w-4 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <span className={isExpired ? 'text-destructive font-semibold' : ''}>
                          {new Date(sub.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isPaid ? (
                        <Button 
                          size="sm" 
                          variant="hero" 
                          className="h-8 rounded-lg text-xs"
                          onClick={() => updatePaymentStatus(sub.id, "paid")}
                        >
                          Mark as Paid
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 rounded-lg text-xs"
                          onClick={() => updatePaymentStatus(sub.id, "unpaid")}
                        >
                          Reset Status
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                    No subscriptions found.
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
