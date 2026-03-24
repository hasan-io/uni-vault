import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Download, Loader2, Trophy, BookOpen, Calendar, Star } from "lucide-react";

export default function StudentPortfolio() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [rank, setRank] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [recRes, achRes, attRes, scoreRes, lbRes] = await Promise.all([
        supabase.from("academic_records").select("*, subjects(name)").eq("student_id", user.id),
        (supabase as any).from("achievements").select("*").eq("student_id", user.id).eq("status", "approved"),
        supabase.from("attendance").select("status, subjects(name), subject_id").eq("student_id", user.id),
        (supabase as any).rpc("calculate_engagement_score", { _student_id: user.id }),
        (supabase as any).rpc("get_leaderboard"),
      ]);
      setRecords(recRes.data || []);
      setAchievements(achRes.data || []);
      setScore(scoreRes.data || 0);
      const idx = (lbRes.data || []).findIndex((l: any) => l.student_id === user.id);
      setRank(idx >= 0 ? idx + 1 : 0);

      const map = new Map<string, { name: string; total: number; present: number }>();
      (attRes.data || []).forEach((a: any) => {
        const key = a.subject_id;
        const existing = map.get(key) || { name: a.subjects?.name || "Unknown", total: 0, present: 0 };
        existing.total++;
        if (a.status === "present" || a.status === "late") existing.present++;
        map.set(key, existing);
      });
      setAttendanceSummary(Array.from(map.values()));
    };
    fetchData();
  }, [user]);

  // Group records by subject
  const subjectMap: Record<string, { name: string; tests: any[]; avg: number }> = {};
  records.forEach((r: any) => {
    const name = r.subjects?.name || "Unknown";
    if (!subjectMap[name]) subjectMap[name] = { name, tests: [], avg: 0 };
    subjectMap[name].tests.push(r);
  });
  Object.values(subjectMap).forEach(s => {
    s.avg = Math.round(s.tests.reduce((acc, t) => acc + (t.marks_obtained / t.max_marks) * 100, 0) / s.tests.length);
  });
  const subjects = Object.values(subjectMap);
  const overallAvg = subjects.length > 0 ? Math.round(subjects.reduce((acc, s) => acc + s.avg, 0) / subjects.length) : 0;

  // All skills from achievements
  const allSkills = Array.from(new Set(achievements.flatMap((a: any) => a.skills || [])));

  const generatePDF = () => {
    setLoading(true);
    const w = window.open("", "_blank");
    if (!w) { setLoading(false); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Portfolio - ${profile?.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Inter, sans-serif; color: #1e293b; background: white; padding: 40px 48px; line-height: 1.5; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3B82F6; padding-bottom: 16px; margin-bottom: 24px; }
  .name { font-size: 26px; font-weight: 700; color: #0F172A; }
  .meta { font-size: 13px; color: #64748B; margin-top: 3px; }
  .stats-right { text-align: right; }
  .score-big { font-size: 28px; font-weight: 700; color: #3B82F6; }
  .score-label { font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Stats row */
  .stats-row { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat-card { flex: 1; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 16px; text-align: center; }
  .stat-value { font-size: 22px; font-weight: 700; color: #3B82F6; }
  .stat-label { font-size: 11px; color: #64748B; margin-top: 2px; }

  /* Section */
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3B82F6; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; gap: 6px; }

  /* Academic table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #F8FAFC; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748B; border-bottom: 1px solid #E2E8F0; }
  td { padding: 7px 10px; border-bottom: 1px solid #F1F5F9; }
  .grade-badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #EFF6FF; color: #3B82F6; }
  .avg-pill { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .avg-high { background: #D1FAE5; color: #059669; }
  .avg-mid { background: #FEF3C7; color: #D97706; }
  .avg-low { background: #FEE2E2; color: #DC2626; }

  /* Attendance */
  .att-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .att-item { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
  .att-name { font-size: 12px; font-weight: 500; }
  .att-pct { font-size: 13px; font-weight: 700; }
  .safe { color: #059669; }
  .risk { color: #DC2626; }
  .badge-safe { background: #D1FAE5; color: #059669; font-size: 10px; padding: 1px 6px; border-radius: 6px; }
  .badge-risk { background: #FEE2E2; color: #DC2626; font-size: 10px; padding: 1px 6px; border-radius: 6px; }

  /* Achievements */
  .ach-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
  .ach-dot { width: 7px; height: 7px; border-radius: 50%; background: #3B82F6; margin-top: 4px; flex-shrink: 0; }
  .ach-title { font-weight: 600; font-size: 12px; }
  .ach-meta { font-size: 11px; color: #64748B; margin-top: 1px; }
  .type-tag { display: inline-block; background: #F1F5F9; color: #475569; padding: 1px 7px; border-radius: 6px; font-size: 10px; margin-left: 6px; }

  /* Skills */
  .skills-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill { background: #EFF6FF; color: #3B82F6; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; border: 1px solid #BFDBFE; }

  /* Footer */
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; }
</style></head><body>

<div class="header">
  <div>
    <div class="name">${profile?.name || ""}</div>
    <div class="meta">Year ${profile?.year || ""} &nbsp;·&nbsp; ${profile?.username || ""}</div>
    <div class="meta" style="margin-top:6px">Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>
  <div class="stats-right">
    <div class="score-big">${score} pts</div>
    <div class="score-label">Engagement Score</div>
    <div style="margin-top:4px;font-size:13px;color:#64748B">${rank ? `Rank #${rank}` : ""}</div>
  </div>
</div>

<div class="stats-row">
  <div class="stat-card"><div class="stat-value">${overallAvg}%</div><div class="stat-label">Academic Average</div></div>
  <div class="stat-card"><div class="stat-value">${achievements.length}</div><div class="stat-label">Verified Achievements</div></div>
  <div class="stat-card"><div class="stat-value">${allSkills.length}</div><div class="stat-label">Skills</div></div>
  <div class="stat-card"><div class="stat-value">${attendanceSummary.length > 0 ? Math.round(attendanceSummary.reduce((acc, a) => acc + (a.present / a.total) * 100, 0) / attendanceSummary.length) : 0}%</div><div class="stat-label">Avg Attendance</div></div>
</div>

<div class="section">
  <div class="section-title">📚 Academic Performance</div>
  <table>
    <thead><tr><th>Subject</th><th>Tests</th><th>Average</th><th>Top Grade</th></tr></thead>
    <tbody>
      ${subjects.map(s => {
        const topGrade = s.tests.sort((a: any, b: any) => b.marks_obtained - a.marks_obtained)[0]?.grade || "-";
        const avgClass = s.avg >= 75 ? "avg-high" : s.avg >= 50 ? "avg-mid" : "avg-low";
        return `<tr>
          <td style="font-weight:500">${s.name}</td>
          <td style="color:#64748B">${s.tests.length} assessment${s.tests.length > 1 ? "s" : ""}</td>
          <td><span class="avg-pill ${avgClass}">${s.avg}%</span></td>
          <td><span class="grade-badge">${topGrade}</span></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>

${attendanceSummary.length > 0 ? `<div class="section">
  <div class="section-title">📅 Attendance Summary</div>
  <div class="att-grid">
    ${attendanceSummary.map(a => {
      const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
      return `<div class="att-item">
        <div>
          <div class="att-name">${a.name}</div>
          <div style="font-size:11px;color:#94A3B8">${a.present}/${a.total} classes</div>
        </div>
        <div style="text-align:right">
          <div class="att-pct ${pct >= 75 ? "safe" : "risk"}">${pct}%</div>
          <span class="${pct >= 75 ? "badge-safe" : "badge-risk"}">${pct >= 75 ? "Safe" : "At Risk"}</span>
        </div>
      </div>`;
    }).join("")}
  </div>
</div>` : ""}

${achievements.length > 0 ? `<div class="section">
  <div class="section-title">🏆 Verified Achievements</div>
  ${achievements.map((a: any) => `<div class="ach-item">
    <div class="ach-dot"></div>
    <div>
      <div class="ach-title">${a.title}<span class="type-tag">${a.type}</span></div>
      ${a.organizer ? `<div class="ach-meta">${a.organizer}${a.date ? ` · ${new Date(a.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}</div>` : ""}
      ${a.skills?.length > 0 ? `<div class="ach-meta">Skills: ${a.skills.join(", ")}</div>` : ""}
    </div>
  </div>`).join("")}
</div>` : ""}

${allSkills.length > 0 ? `<div class="section">
  <div class="section-title">⚡ Skills</div>
  <div class="skills-wrap">${allSkills.map(s => `<span class="skill">${s}</span>`).join("")}</div>
</div>` : ""}

<div class="footer">Generated by UniVault · Verified Academic & Co-Curricular Record System</div>
</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); setLoading(false); }, 300);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-display font-bold">
              <Briefcase className="w-7 h-7 inline mr-2 text-primary" />Portfolio
            </h1>
            <p className="text-muted-foreground">Your complete verified academic profile</p>
          </div>
          <Button onClick={generatePDF} disabled={loading} size="lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Generate Portfolio PDF
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-t-[3px] border-t-primary">
            <CardContent className="p-5 text-center">
              <p className="text-[30px] font-display font-bold text-primary">{score}</p>
              <p className="text-xs text-muted-foreground mt-1">Engagement Score</p>
            </CardContent>
          </Card>
          <Card className="border-t-[3px] border-t-amber-400">
            <CardContent className="p-5 text-center">
              <p className="text-[30px] font-display font-bold text-amber-500">#{rank || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Leaderboard Rank</p>
            </CardContent>
          </Card>
          <Card className="border-t-[3px] border-t-emerald-500">
            <CardContent className="p-5 text-center">
              <p className="text-[30px] font-display font-bold text-emerald-500">{achievements.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Verified Achievements</p>
            </CardContent>
          </Card>
          <Card className="border-t-[3px] border-t-indigo-500">
            <CardContent className="p-5 text-center">
              <p className="text-[30px] font-display font-bold text-indigo-500">{overallAvg}%</p>
              <p className="text-xs text-muted-foreground mt-1">Academic Average</p>
            </CardContent>
          </Card>
        </div>

        {/* Academic Performance — grouped by subject */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Academic Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">No academic records yet</p>
            ) : (
              <div className="space-y-3">
                {subjects.map((s) => {
                  const topGrade = s.tests.sort((a: any, b: any) => b.marks_obtained - a.marks_obtained)[0]?.grade;
                  return (
                    <div key={s.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.tests.length} assessment{s.tests.length > 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold">{s.avg}%</p>
                          <p className="text-xs text-muted-foreground">average</p>
                        </div>
                        <Badge variant={s.avg >= 75 ? "success" : s.avg >= 50 ? "warning" : "destructive"} className="text-xs">
                          {topGrade}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance */}
        {attendanceSummary.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attendanceSummary.map((a) => {
                  const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
                  return (
                    <div key={a.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                      <div>
                        <p className="font-medium text-sm">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.present}/{a.total} classes</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${pct >= 75 ? "text-emerald-500" : "text-red-500"}`}>{pct}%</span>
                        <Badge variant={pct >= 75 ? "success" : "destructive"} className="text-xs">
                          {pct >= 75 ? "Safe" : "At Risk"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Verified Achievements ({achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {achievements.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{a.title}</p>
                        <Badge variant="outline" className="text-xs">{a.type}</Badge>
                      </div>
                      {a.organizer && <p className="text-xs text-muted-foreground mt-0.5">{a.organizer}</p>}
                      {a.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {a.skills.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills */}
        {allSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Skills ({allSkills.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allSkills.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">{s}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}