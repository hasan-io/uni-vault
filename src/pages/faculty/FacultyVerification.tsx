import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, CheckCircle2, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";

export default function FacultyVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchAchievements = async () => {
    const { data, error } = await (supabase as any)
      .from("achievements")
      .select("*, profiles:student_id(name, username, course_id, section_id, year)")
      .order("submitted_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch achievements:", error);
    }
    setAchievements(data || []);
  };

  useEffect(() => { fetchAchievements(); }, []);

  useEffect(() => {
    const ch = supabase.channel("faculty-achievements").on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, () => fetchAchievements()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleVerify = async (status: "approved" | "rejected") => {
    if (!selected || !user) return;
    if (status === "rejected" && !rejectReason.trim()) {
      toast({ title: "Error", description: "Please enter a rejection reason", variant: "destructive" });
      return;
    }
    setProcessing(true);

    // Update achievement status
    await (supabase as any).from("achievements").update({ status }).eq("id", selected.id);

    // Create verification record
    await (supabase as any).from("verifications").insert({
      achievement_id: selected.id,
      faculty_id: user.id,
      status,
      remarks: status === "rejected" ? rejectReason.trim() : null,
    });

    // Notify student
    const msg = status === "approved"
      ? `Your achievement "${selected.title}" has been approved! ✓`
      : `Your achievement "${selected.title}" was rejected. Reason: ${rejectReason.trim()}`;
    await (supabase as any).from("notifications").insert({
      user_id: selected.student_id,
      message: msg,
    });

    toast({ title: status === "approved" ? "Achievement Approved" : "Achievement Rejected" });
    setSelected(null);
    setRejectReason("");
    fetchAchievements();
    setProcessing(false);
  };

  const pending = achievements.filter(a => a.status === "pending");
  const reviewed = achievements.filter(a => a.status !== "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold"><ShieldCheck className="w-7 h-7 inline mr-2 text-primary" />Verification Panel</h1>
          <p className="text-muted-foreground">Review and verify student achievements</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><Clock className="w-5 h-5 text-warning" />Pending Submissions ({pending.length})</CardTitle></CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No pending submissions</p>
            ) : (
              <div className="space-y-2">
                {pending.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => setSelected(a)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{a.title}</h4>
                        <Badge variant="warning">Pending</Badge>
                        <Badge variant="outline" className="text-xs">{a.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">by {a.profiles?.name || "Unknown"} · {a.date ? new Date(a.date).toLocaleDateString() : ""}</p>
                    </div>
                    <Button size="sm" variant="outline">Review</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {reviewed.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="font-display">Reviewed ({reviewed.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reviewed.slice(0, 20).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                    {a.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{a.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">by {a.profiles?.name}</span>
                    </div>
                    <Badge variant={a.status === "approved" ? "success" : "destructive"}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setRejectReason(""); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Review Achievement</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Student:</span> <span className="font-medium">{selected.profiles?.name}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline">{selected.type}</Badge></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Title:</span> <span className="font-medium">{selected.title}</span></div>
                  {selected.organizer && <div className="col-span-2"><span className="text-muted-foreground">Organizer:</span> {selected.organizer}</div>}
                  {selected.date && <div><span className="text-muted-foreground">Date:</span> {new Date(selected.date).toLocaleDateString()}</div>}
                </div>
                {selected.description && <div><Label className="text-muted-foreground text-xs">Description</Label><p className="text-sm mt-1">{selected.description}</p></div>}
                {selected.skills?.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Skills</Label>
                    <div className="flex flex-wrap gap-1 mt-1">{selected.skills.map((s: string) => <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{s}</span>)}</div>
                  </div>
                )}
                {selected.proof_url && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Certificate</Label>
                    <a href={selected.proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary text-sm mt-1 hover:underline">
                      <ExternalLink className="w-3 h-3" />View Certificate
                    </a>
                  </div>
                )}

                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Rejection Reason (required for reject)</Label>
                    <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason for rejection..." rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleVerify("approved")} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}Approve
                    </Button>
                    <Button className="flex-1" variant="destructive" onClick={() => handleVerify("rejected")} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
