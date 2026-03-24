import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ClipboardCheck, BookOpen, Trophy, Award, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ avgMarks: 0, attendancePct: 0, subjects: 0, rank: 0, score: 0 });
  const [subjectMarks, setSubjectMarks] = useState<Array<{ name: string; avg: number }>>([]);
  const [achievementStats, setAchievementStats] = useState({ verified: 0, pending: 0, rejected: 0 });
  const [activityBreakdown, setActivityBreakdown] = useState<Array<{ type: string; count: number }>>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchStats = async () => {
    if (!user) return;

    const [recordsRes, attendanceRes, subjectsRes] = await Promise.all([
      supabase.from("academic_records").select("marks_obtained, max_marks, subject_id").eq("student_id", user.id),
      supabase.from("attendance").select("status, subject_id").eq("student_id", user.id),
      supabase.from("subjects").select("id, name"),
    ]);

    const records = recordsRes.data || [];
    const attendance = attendanceRes.data || [];
    const subjects = subjectsRes.data || [];

    const studentSubjectIds = new Set([
      ...records.map(r => r.subject_id),
      ...attendance.map(a => a.subject_id),
    ]);

    let totalPct = 0, testCount = 0;
    records.forEach(r => {
      if (r.max_marks > 0) { totalPct += (r.marks_obtained / r.max_marks) * 100; testCount++; }
    });

    const totalClasses = attendance.length;
    const present = attendance.filter(a => a.status === "present" || a.status === "late").length;

    const subjectMap = new Map<string, { total: number; count: number; name: string }>();
    records.forEach(r => {
      const sub = subjects.find(s => s.id === r.subject_id);
      if (!sub) return;
      const existing = subjectMap.get(r.subject_id) || { total: 0, count: 0, name: sub.name };
      existing.total += r.max_marks > 0 ? (r.marks_obtained / r.max_marks) * 100 : 0;
      existing.count++;
      subjectMap.set(r.subject_id, existing);
    });

    setSubjectMarks(
      Array.from(subjectMap.values()).map(v => ({ name: v.name, avg: Math.round(v.total / v.count) }))
    );

    // Engagement score
    const { data: scoreData } = await (supabase as any).rpc("calculate_engagement_score", { _student_id: user.id });
    const score = scoreData || 0;

    // Rank
    const { data: leaderboard } = await (supabase as any).rpc("get_leaderboard");
    const rankIdx = (leaderboard || []).findIndex((l: any) => l.student_id === user.id);

    // Achievements
    const { data: achievements } = await (supabase as any).from("achievements").select("status, type").eq("student_id", user.id);
    const achs = achievements || [];
    const verified = achs.filter((a: any) => a.status === "approved").length;
    const pending = achs.filter((a: any) => a.status === "pending").length;
    const rejected = achs.filter((a: any) => a.status === "rejected").length;
    setAchievementStats({ verified, pending, rejected });

    // Activity breakdown by type
    const typeMap = new Map<string, number>();
    achs.filter((a: any) => a.status === "approved").forEach((a: any) => {
      typeMap.set(a.type, (typeMap.get(a.type) || 0) + 1);
    });
    setActivityBreakdown(Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })));

    // Recent notifications
    const { data: notifs } = await (supabase as any).from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);
    setNotifications(notifs || []);

    setStats({
      avgMarks: testCount > 0 ? Math.round(totalPct / testCount) : 0,
      attendancePct: totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0,
      subjects: studentSubjectIds.size,
      rank: rankIdx >= 0 ? rankIdx + 1 : 0,
      score,
    });
  };

  useEffect(() => { fetchStats(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel("student-records-dash").on("postgres_changes", { event: "*", schema: "public", table: "academic_records", filter: `student_id=eq.${user.id}` }, () => fetchStats()).subscribe();
    const ch2 = supabase.channel("student-attendance-dash").on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `student_id=eq.${user.id}` }, () => fetchStats()).subscribe();
    const ch3 = supabase.channel("student-achievements-dash").on("postgres_changes", { event: "*", schema: "public", table: "achievements", filter: `student_id=eq.${user.id}` }, () => fetchStats()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [user]);

  const pieData = [
    { name: "Verified", value: achievementStats.verified, color: "hsl(160, 84%, 39%)" },
    { name: "Pending", value: achievementStats.pending, color: "hsl(38, 92%, 50%)" },
    { name: "Rejected", value: achievementStats.rejected, color: "hsl(0, 84%, 60%)" },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Your academic & engagement overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Average Marks" value={`${stats.avgMarks}%`} icon={BarChart3} variant="blue" />
          <StatCard title="Attendance" value={`${stats.attendancePct}%`} icon={ClipboardCheck} variant={stats.attendancePct >= 75 ? "emerald" : "amber"} description={stats.attendancePct < 75 ? "At Risk" : "Safe"} />
          <StatCard title="Subjects" value={stats.subjects} icon={BookOpen} variant="indigo" />
          <StatCard title="Leaderboard Rank" value={stats.rank > 0 ? `#${stats.rank}` : "—"} icon={Trophy} variant="amber" />
          <StatCard title="Engagement Score" value={stats.score} icon={TrendingUp} variant="emerald" />
          <StatCard title="Achievements" value={achievementStats.verified} icon={Award} variant="blue" description={`${achievementStats.pending} pending`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subjectMarks.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display">Subject Performance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subjectMarks}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="avg" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {pieData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display">Achievement Status</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 ml-4">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activityBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="font-display">Activity Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={activityBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(239, 84%, 67%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="font-display">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}