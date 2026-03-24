import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Award, Upload, Loader2, X, CheckCircle2, XCircle, Clock } from "lucide-react";

const TYPES = ["Hackathon", "Workshop", "Internship", "Sports", "Cultural", "Other"];

export default function StudentAchievements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", type: "Hackathon", description: "", organizer: "", date: "", skillInput: "", skills: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);

  const fetchAchievements = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("achievements").select("*").eq("student_id", user.id).order("submitted_at", { ascending: false });
    setAchievements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAchievements(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("my-achievements").on("postgres_changes", { event: "*", schema: "public", table: "achievements", filter: `student_id=eq.${user.id}` }, () => fetchAchievements()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const addSkill = () => {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm(p => ({ ...p, skills: [...p.skills, s], skillInput: "" }));
    }
  };

  const removeSkill = (skill: string) => {
    setForm(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: "Error", description: "Title is required", variant: "destructive" }); return; }
    if (!user) return;
    setSubmitting(true);

    let proofUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage.from("certificates").upload(path, file);
      if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setSubmitting(false); return; }
      const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(uploadData.path);
      proofUrl = urlData.publicUrl;
    }

    const { error } = await (supabase as any).from("achievements").insert({
      student_id: user.id,
      title: form.title.trim(),
      type: form.type,
      description: form.description.trim() || null,
      organizer: form.organizer.trim() || null,
      date: form.date || null,
      skills: form.skills,
      proof_url: proofUrl,
      status: "pending",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Achievement submitted", description: "Awaiting faculty verification" });
      setForm({ title: "", type: "Hackathon", description: "", organizer: "", date: "", skillInput: "", skills: [] });
      setFile(null);
      fetchAchievements();

      // Notify faculty
      const { data: facRoles } = await supabase.from("user_roles").select("user_id").eq("role", "faculty");
      if (facRoles) {
        const notifs = facRoles.map((f: any) => ({
          user_id: f.user_id,
          message: `New achievement submission: "${form.title.trim()}" by student`,
        }));
        await (supabase as any).from("notifications").insert(notifs);
      }
    }
    setSubmitting(false);
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-warning" />;
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge variant="success">Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="warning">Pending</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold"><Award className="w-7 h-7 inline mr-2 text-primary" />My Achievements</h1>
          <p className="text-muted-foreground">Submit and track your co-curricular achievements</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display">Add Achievement</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Achievement title" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organizer</Label>
                  <Input value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))} placeholder="Organization name" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your achievement" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input value={form.skillInput} onChange={e => setForm(p => ({ ...p, skillInput: e.target.value }))} placeholder="Type a skill and press Enter" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
                  <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
                </div>
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.skills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {s}
                        <button type="button" onClick={() => removeSkill(s)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Certificate (PDF or Image)</Label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Choose File
                  </Button>
                  <span className="text-sm text-muted-foreground">{file?.name || "No file chosen"}</span>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Submit Achievement
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">My Submissions ({achievements.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : achievements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No achievements submitted yet</p>
            ) : (
              <div className="space-y-3">
                {achievements.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                    {statusIcon(a.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{a.title}</h4>
                        {statusBadge(a.status)}
                        <Badge variant="outline" className="text-xs">{a.type}</Badge>
                      </div>
                      {a.organizer && <p className="text-xs text-muted-foreground mt-0.5">{a.organizer}</p>}
                      {a.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {a.skills.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{a.date ? new Date(a.date).toLocaleDateString() : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}
