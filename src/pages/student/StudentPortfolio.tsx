import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Download, Loader2 } from "lucide-react";

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
    const fetch = async () => {
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

      // Attendance summary
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
    fetch();
  }, [user]);

  const generatePDF = () => {
    setLoading(true);
    const w = window.open("", "_blank");
    if (!w) { setLoading(false); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Portfolio - ${profile?.name}</title>
<style>
body{font-family:Inter,sans-serif;margin:40px;color:#0F172A;line-height:1.6}
h1{font-size:28px;color:#3B82F6;margin-bottom:4px}
h2{font-size:18px;border-bottom:2px solid #3B82F6;padding-bottom:4px;margin-top:28px;color:#0F172A}
.subtitle{color:#64748B;font-size:14px;margin-bottom:24px}
.stat{display:inline-block;padding:12px 20px;border:1px solid #E2E8F0;border-radius:12px;margin-right:12px;margin-bottom:8px;text-align:center}
.stat-value{font-size:24px;font-weight:700;color:#3B82F6}
.stat-label{font-size:12px;color:#64748B}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
th,td{padding:8px;text-align:left;border-bottom:1px solid #E2E8F0}
th{background:#F8FAFC;font-weight:600;text-transform:uppercase;font-size:11px;color:#64748B}
.skill{display:inline-block;background:#EFF6FF;color:#3B82F6;padding:3px 12px;border-radius:12px;font-size:12px;margin:3px}
.badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600}
.safe{background:#D1FAE5;color:#059669}
.risk{background:#FEE2E2;color:#DC2626}
</style></head><body>
<h1>${profile?.name || ""}</h1>
<p class="subtitle">Year ${profile?.year || ""} · ${profile?.username || ""}</p>
<div>
<div class="stat"><div class="stat-value">${score}</div><div class="stat-label">Engagement Score</div></div>
<div class="stat"><div class="stat-value">#${rank || "—"}</div><div class="stat-label">Leaderboard Rank</div></div>
<div class="stat"><div class="stat-value">${achievements.length}</div><div class="stat-label">Verified Achievements</div></div>
</div>
<h2>Academic Performance</h2>
<table><thead><tr><th>Subject</th><th>Test</th><th>Marks</th><th>Grade</th></tr></thead><tbody>
${records.map(r => `<tr><td>${r.subjects?.name || ""}</td><td>${r.test_name}</td><td>${r.marks_obtained}/${r.max_marks}</td><td>${r.grade}</td></tr>`).join("")}
</tbody></table>
<h2>Attendance Summary</h2>
<table><thead><tr><th>Subject</th><th>Attended</th><th>Total</th><th>%</th><th>Status</th></tr></thead><tbody>
${attendanceSummary.map(a => {
  const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
  return `<tr><td>${a.name}</td><td>${a.present}</td><td>${a.total}</td><td>${pct}%</td><td><span class="badge ${pct >= 75 ? "safe" : "risk"}">${pct >= 75 ? "Safe" : "At Risk"}</span></td></tr>`;
}).join("")}
</tbody></table>
${achievements.length > 0 ? `<h2>Verified Achievements</h2><table><thead><tr><th>Title</th><th>Type</th><th>Skills</th></tr></thead><tbody>${achievements.map((a: any) => `<tr><td>${a.title}</td><td>${a.type}</td><td>${(a.skills || []).map((s: string) => `<span class="skill">${s}</span>`).join(" ")}</td></tr>`).join("")}</tbody></table>` : ""}
</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); setLoading(false); }, 300);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-display font-bold"><Briefcase className="w-7 h-7 inline mr-2 text-primary" />Portfolio</h1>
            <p className="text-muted-foreground">Generate a comprehensive academic portfolio</p>
          </div>
          <Button onClick={generatePDF} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Generate Portfolio PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-t-[3px] border-t-primary">
            <CardContent className="p-5 text-center">
              <p className="text-[32px] font-display font-bold text-primary">{score}</p>
              <p className="text-sm text-muted-foreground">Engagement Score</p>
            </CardContent>
          </Card>
          <Card className="border-t-[3px] border-t-warning">
            <CardContent className="p-5 text-center">
              <p className="text-[32px] font-display font-bold text-warning">#{rank || "—"}</p>
              <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
            </CardContent>
          </Card>
          <Card className="border-t-[3px] border-t-success">
            <CardContent className="p-5 text-center">
              <p className="text-[32px] font-display font-bold text-success">{achievements.length}</p>
              <p className="text-sm text-muted-foreground">Verified Achievements</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display">Academic Records ({records.length})</CardTitle></CardHeader>
          <CardContent>
            {records.length === 0 ? <p className="text-muted-foreground text-sm">No records yet</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider"><th className="px-4 py-2 text-left">Subject</th><th className="px-4 py-2 text-left">Test</th><th className="px-4 py-2 text-left">Marks</th><th className="px-4 py-2 text-left">Grade</th></tr></thead>
                  <tbody>{records.map(r => (
                    <tr key={r.id} className="border-t border-border/50"><td className="px-4 py-2">{r.subjects?.name}</td><td className="px-4 py-2">{r.test_name}</td><td className="px-4 py-2">{r.marks_obtained}/{r.max_marks}</td><td className="px-4 py-2 font-medium">{r.grade}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}
