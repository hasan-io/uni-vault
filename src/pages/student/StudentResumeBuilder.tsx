import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Sparkles, Loader2 } from "lucide-react";

export default function StudentResumeBuilder() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [objective, setObjective] = useState("");
  const [projects, setProjects] = useState("");
  const [certifications, setCertifications] = useState("");
  const [achievements, setAchievements] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ score: number; suggestions: string[] } | null>(null);
  const [attendancePct, setAttendancePct] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [achRes, recRes, attRes] = await Promise.all([
        (supabase as any).from("achievements").select("*").eq("student_id", user.id).eq("status", "approved"),
        supabase.from("academic_records").select("*, subjects(name)").eq("student_id", user.id),
        supabase.from("attendance").select("status").eq("student_id", user.id),
      ]);
      const achs = achRes.data || [];
      setAchievements(achs);
      setRecords(recRes.data || []);

      const allSkills = new Set<string>();
      achs.forEach((a: any) => a.skills?.forEach((s: string) => allSkills.add(s)));
      setSkills(Array.from(allSkills));

      const att = attRes.data || [];
      const total = att.length;
      const present = att.filter((a: any) => a.status === "present" || a.status === "late").length;
      setAttendancePct(total > 0 ? Math.round((present / total) * 100) : 0);
    };
    fetchData();
  }, [user]);

  const avgMarks = (() => {
    let t = 0, c = 0;
    records.forEach(r => { if (r.max_marks > 0) { t += (r.marks_obtained / r.max_marks) * 100; c++; } });
    return c > 0 ? Math.round(t / c) : 0;
  })();

  const analyzeResume = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-resume", {
        body: {
          name: profile?.name,
          course: profile?.course_id,
          year: profile?.year,
          avgMarks,
          attendancePct,
          achievementCount: achievements.length,
          achievementTypes: achievements.map((a: any) => a.type),
          skills,
        },
      });
      if (error) throw error;
      setAnalysis(data);
    } catch {
      toast({ title: "Analysis failed", description: "Please try again", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const downloadPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Resume - ${profile?.name}</title>
<style>
body{font-family:Inter,sans-serif;margin:40px;color:#0F172A;line-height:1.6}
h1{font-size:24px;margin-bottom:4px}
h2{font-size:16px;border-bottom:2px solid #3B82F6;padding-bottom:4px;margin-top:24px;color:#3B82F6}
.subtitle{color:#64748B;font-size:14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.skill{display:inline-block;background:#EFF6FF;color:#3B82F6;padding:2px 10px;border-radius:12px;font-size:12px;margin:2px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:6px 8px;text-align:left;border-bottom:1px solid #E2E8F0}
th{background:#F8FAFC;font-weight:600;text-transform:uppercase;font-size:11px;color:#64748B}
</style></head><body>
<h1>${profile?.name || ""}</h1>
<p class="subtitle">${profile?.username || ""} · Year ${profile?.year || ""}</p>
${objective ? `<h2>Objective</h2><p>${objective}</p>` : ""}
<h2>Education</h2>
<table><thead><tr><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead><tbody>
${records.map(r => `<tr><td>${r.subjects?.name || ""}</td><td>${r.marks_obtained}/${r.max_marks}</td><td>${r.grade}</td></tr>`).join("")}
</tbody></table>
<p style="margin-top:8px;font-size:13px">Average: ${avgMarks}% · Attendance: ${attendancePct}%</p>
${achievements.length > 0 ? `<h2>Achievements</h2><ul>${achievements.map((a: any) => `<li><strong>${a.title}</strong> (${a.type})${a.organizer ? ` — ${a.organizer}` : ""}</li>`).join("")}</ul>` : ""}
${skills.length > 0 ? `<h2>Skills</h2><div>${skills.map(s => `<span class="skill">${s}</span>`).join(" ")}</div>` : ""}
${projects ? `<h2>Projects</h2><p>${projects.replace(/\n/g, "<br/>")}</p>` : ""}
${certifications ? `<h2>Certifications</h2><p>${certifications.replace(/\n/g, "<br/>")}</p>` : ""}
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-display font-bold"><FileText className="w-7 h-7 inline mr-2 text-primary" />Resume Builder</h1>
            <p className="text-muted-foreground">Build your resume with auto-filled profile data</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={analyzeResume} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Analyse My Resume
            </Button>
            <Button onClick={downloadPDF}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Side */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Personal Info (Auto-filled)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{profile?.name}</span></div>
                <div><span className="text-muted-foreground">Year:</span> <span className="font-medium">{profile?.year}</span></div>
                <div><span className="text-muted-foreground">Username:</span> <span className="font-mono">{profile?.username}</span></div>
                <div><span className="text-muted-foreground">Avg Marks:</span> <span className="font-medium">{avgMarks}%</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Objective / Summary</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="Write a brief career objective..." rows={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Skills ({skills.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.length === 0 && <p className="text-sm text-muted-foreground">Skills will be auto-filled from your achievements</p>}
                  {skills.map(s => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Projects (Optional)</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={projects} onChange={e => setProjects(e.target.value)} placeholder="Describe your projects..." rows={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Certifications (Optional)</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={certifications} onChange={e => setCertifications(e.target.value)} placeholder="List your certifications..." rows={2} />
              </CardContent>
            </Card>
          </div>

          {/* Preview / Analysis Side */}
          <div className="space-y-4">
            {analysis && (
              <Card className="border-t-[3px] border-t-primary">
                <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />AI Analysis</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeDasharray={`${(analysis.score / 100) * 213.6} 213.6`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-lg">{analysis.score}</span>
                    </div>
                    <div>
                      <p className="font-display font-semibold">Resume Score</p>
                      <p className="text-sm text-muted-foreground">out of 100</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {analysis.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-muted/50">
                        <span className="text-primary font-bold text-sm mt-0.5">{i + 1}.</span>
                        <p className="text-sm">{s}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Resume Preview</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-4">
                <div>
                  <h3 className="font-display font-bold text-lg">{profile?.name}</h3>
                  <p className="text-muted-foreground text-xs">{profile?.username} · Year {profile?.year}</p>
                </div>
                {objective && <div><h4 className="font-semibold text-xs uppercase text-primary tracking-wider mb-1">Objective</h4><p className="text-muted-foreground">{objective}</p></div>}
                {records.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase text-primary tracking-wider mb-1">Education</h4>
                    {records.map((r: any) => (
                      <div key={r.id} className="flex justify-between py-0.5">
                        <span>{r.subjects?.name} — {r.test_name}</span>
                        <span className="font-medium">{r.marks_obtained}/{r.max_marks} ({r.grade})</span>
                      </div>
                    ))}
                  </div>
                )}
                {achievements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase text-primary tracking-wider mb-1">Achievements</h4>
                    {achievements.map((a: any) => <p key={a.id} className="py-0.5">• {a.title} ({a.type})</p>)}
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-xs uppercase text-primary tracking-wider mb-1">Skills</h4>
                    <div className="flex flex-wrap gap-1">{skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">{s}</span>)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}
