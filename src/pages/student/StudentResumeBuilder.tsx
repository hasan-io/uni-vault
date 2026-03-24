import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Sparkles, Loader2, Mail, User, BookOpen, Trophy, Wrench, FolderOpen, Award } from "lucide-react";

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

  // Group records by subject
  const subjectMap: Record<string, { name: string; tests: any[] }> = {};
  records.forEach((r: any) => {
    const subName = r.subjects?.name || "Unknown";
    if (!subjectMap[subName]) subjectMap[subName] = { name: subName, tests: [] };
    subjectMap[subName].tests.push(r);
  });
  const subjects = Object.values(subjectMap);

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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1e293b; background: white; padding: 48px; line-height: 1.5; }
  .header { border-bottom: 3px solid #3B82F6; padding-bottom: 16px; margin-bottom: 24px; }
  .name { font-size: 28px; font-weight: 700; color: #0F172A; letter-spacing: -0.5px; }
  .meta { font-size: 13px; color: #64748B; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3B82F6; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #E2E8F0; }
  .objective { font-size: 13px; color: #475569; line-height: 1.7; }
  .edu-item { margin-bottom: 10px; }
  .edu-subject { font-weight: 600; font-size: 13px; color: #0F172A; }
  .edu-tests { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .edu-test { font-size: 12px; background: #F1F5F9; padding: 2px 8px; border-radius: 4px; color: #475569; }
  .edu-avg { font-size: 12px; color: #64748B; margin-top: 4px; }
  .ach-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
  .ach-dot { width: 6px; height: 6px; border-radius: 50%; background: #3B82F6; margin-top: 5px; flex-shrink: 0; }
  .ach-title { font-weight: 600; font-size: 13px; }
  .ach-meta { font-size: 12px; color: #64748B; }
  .skills-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill { background: #EFF6FF; color: #3B82F6; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .stats { display: flex; gap: 20px; margin-top: 8px; }
  .stat { font-size: 12px; color: #64748B; }
  .stat strong { color: #0F172A; }
</style></head><body>
<div class="header">
  <div class="name">${profile?.name || ""}</div>
  <div class="meta">Year ${profile?.year || ""} · ${profile?.username || ""}</div>
  <div class="stats">
    <div class="stat">Academic Average: <strong>${avgMarks}%</strong></div>
    <div class="stat">Attendance: <strong>${attendancePct}%</strong></div>
    <div class="stat">Verified Achievements: <strong>${achievements.length}</strong></div>
  </div>
</div>

${objective ? `<div class="section"><div class="section-title">Objective</div><p class="objective">${objective}</p></div>` : ""}

${subjects.length > 0 ? `<div class="section"><div class="section-title">Education</div>
${subjects.map(s => {
  const subAvg = s.tests.reduce((acc: number, t: any) => acc + (t.marks_obtained / t.max_marks) * 100, 0) / s.tests.length;
  return `<div class="edu-item">
    <div class="edu-subject">${s.name}</div>
    <div class="edu-tests">${s.tests.map((t: any) => `<span class="edu-test">${t.test_name}: ${t.marks_obtained}/${t.max_marks} (${t.grade})</span>`).join("")}</div>
    <div class="edu-avg">Subject Average: ${Math.round(subAvg)}%</div>
  </div>`;
}).join("")}
</div>` : ""}

${achievements.length > 0 ? `<div class="section"><div class="section-title">Achievements & Activities</div>
${achievements.map((a: any) => `<div class="ach-item"><div class="ach-dot"></div><div>
  <div class="ach-title">${a.title} <span style="font-weight:400;color:#64748B">(${a.type})</span></div>
  ${a.organizer ? `<div class="ach-meta">${a.organizer}${a.date ? ` · ${new Date(a.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}` : ""}</div>` : ""}
  ${a.skills?.length > 0 ? `<div class="ach-meta">Skills: ${a.skills.join(", ")}</div>` : ""}
</div></div>`).join("")}
</div>` : ""}

${skills.length > 0 ? `<div class="section"><div class="section-title">Skills</div><div class="skills-wrap">${skills.map(s => `<span class="skill">${s}</span>`).join("")}</div></div>` : ""}

${projects ? `<div class="section"><div class="section-title">Projects</div><p class="objective">${projects.replace(/\n/g, "<br/>")}</p></div>` : ""}

${certifications ? `<div class="section"><div class="section-title">Certifications</div><p class="objective">${certifications.replace(/\n/g, "<br/>")}</p></div>` : ""}

</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-display font-bold">
              <FileText className="w-7 h-7 inline mr-2 text-primary" />Resume Builder
            </h1>
            <p className="text-muted-foreground">Build your resume with auto-filled profile data</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={analyzeResume} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Analyse My Resume
            </Button>
            <Button onClick={downloadPDF}>
              <Download className="w-4 h-4 mr-2" />Download PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT — Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" />Personal Info (Auto-filled)</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{profile?.name}</span></div>
                <div><span className="text-muted-foreground">Year:</span> <span className="font-medium">Year {profile?.year}</span></div>
                <div><span className="text-muted-foreground">Username:</span> <span className="font-mono text-xs">{profile?.username}</span></div>
                <div><span className="text-muted-foreground">Avg Marks:</span> <span className="font-medium text-primary">{avgMarks}%</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base">Objective / Summary</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="Write a brief career objective..." rows={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" />Skills ({skills.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.length === 0
                    ? <p className="text-sm text-muted-foreground">Skills auto-fill from your verified achievements</p>
                    : skills.map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><FolderOpen className="w-4 h-4 text-primary" />Projects (Optional)</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={projects} onChange={e => setProjects(e.target.value)} placeholder="Describe your projects..." rows={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Certifications (Optional)</CardTitle></CardHeader>
              <CardContent>
                <Textarea value={certifications} onChange={e => setCertifications(e.target.value)} placeholder="List your certifications..." rows={2} />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Preview + Analysis */}
          <div className="space-y-4">
            {/* AI Analysis */}
            {analysis && (
              <Card className="border-t-[3px] border-t-primary">
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                          strokeDasharray={`${(analysis.score / 100) * 213.6} 213.6`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-lg">{analysis.score}</span>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-lg">Resume Score</p>
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

            {/* Resume Preview — looks like a real resume */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Resume Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-white border border-border/40 mx-4 mb-4 rounded-lg overflow-hidden shadow-sm">
                  {/* Resume Header */}
                  <div className="bg-[#0F172A] px-6 py-5 text-white">
                    <h2 className="text-xl font-bold tracking-tight">{profile?.name || "Your Name"}</h2>
                    <p className="text-blue-300 text-xs mt-1">{profile?.username} · Year {profile?.year}</p>
                    <div className="flex flex-wrap gap-4 mt-3">
                      <span className="text-xs text-slate-300">Avg: <span className="text-white font-semibold">{avgMarks}%</span></span>
                      <span className="text-xs text-slate-300">Attendance: <span className="text-white font-semibold">{attendancePct}%</span></span>
                      <span className="text-xs text-slate-300">Achievements: <span className="text-white font-semibold">{achievements.length} verified</span></span>
                    </div>
                  </div>

                  <div className="px-6 py-4 space-y-4 text-sm">
                    {/* Objective */}
                    {objective && (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Objective</span>
                          <div className="flex-1 h-px bg-primary/20" />
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">{objective}</p>
                      </div>
                    )}

                    {/* Education */}
                    {subjects.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Education</span>
                          <div className="flex-1 h-px bg-primary/20" />
                        </div>
                        <div className="space-y-2">
                          {subjects.map((s) => {
                            const subAvg = Math.round(s.tests.reduce((acc: number, t: any) => acc + (t.marks_obtained / t.max_marks) * 100, 0) / s.tests.length);
                            const topGrade = s.tests.sort((a: any, b: any) => b.marks_obtained - a.marks_obtained)[0]?.grade;
                            return (
                              <div key={s.name} className="flex items-start justify-between py-1 border-b border-slate-100 last:border-0">
                                <div>
                                  <p className="font-semibold text-slate-800 text-xs">{s.name}</p>
                                  <p className="text-[11px] text-slate-500">{s.tests.length} assessment{s.tests.length > 1 ? "s" : ""}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-bold text-slate-700">{subAvg}%</span>
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{topGrade}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Achievements */}
                    {achievements.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Achievements</span>
                          <div className="flex-1 h-px bg-primary/20" />
                        </div>
                        <div className="space-y-2">
                          {achievements.map((a: any) => (
                            <div key={a.id} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              <div>
                                <p className="font-semibold text-slate-800 text-xs">{a.title}
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal">{a.type}</span>
                                </p>
                                {a.organizer && (
                                  <p className="text-[11px] text-slate-500">
                                    {a.organizer}{a.date ? ` · ${new Date(a.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}
                                  </p>
                                )}
                                {a.skills?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {a.skills.map((s: string) => (
                                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{s}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Wrench className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Skills</span>
                          <div className="flex-1 h-px bg-primary/20" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map(s => (
                            <span key={s} className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {projects && (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <FolderOpen className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Projects</span>
                          <div className="flex-1 h-px bg-primary/20" />
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{projects}</p>
                      </div>
                    )}

                    {/* Certifications */}
                    {certifications && (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Award className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Certifications</span>
                          <div className="flex-1 h-px bg-primary/20" />
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{certifications}</p>
                      </div>
                    )}

                    {/* Empty state */}
                    {!objective && subjects.length === 0 && achievements.length === 0 && skills.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-6">Your resume preview will appear here as data loads</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}