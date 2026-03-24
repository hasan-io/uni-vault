import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Users, BookOpen, ClipboardCheck, ShieldCheck } from "lucide-react";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, subjects: 0, attendanceToday: false, pendingVerifications: 0 });

  const fetchStats = async () => {
    if (!user) return;
    const [subjectsRes, attendanceRes] = await Promise.all([
      supabase.from("subjects").select("id", { count: "exact", head: true }).eq("faculty_id", user.id),
      supabase.from("attendance").select("id", { count: "exact", head: true })
        .eq("marked_by", user.id).eq("date", new Date().toISOString().split("T")[0]),
    ]);

    const { data: subjectData } = await supabase.from("subjects").select("course_id, year").eq("faculty_id", user.id);
    let studentCount = 0;
    if (subjectData && subjectData.length > 0) {
      const { count } = await supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student");
      studentCount = count || 0;
    }

    const { data: pendingAchs } = await (supabase as any).from("achievements").select("id", { count: "exact", head: true }).eq("status", "pending");

    setStats({
      students: studentCount,
      subjects: subjectsRes.count || 0,
      attendanceToday: (attendanceRes.count || 0) > 0,
      pendingVerifications: pendingAchs?.length || 0,
    });
  };

  useEffect(() => { fetchStats(); }, [user]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold text-foreground">Faculty Dashboard</h1>
          <p className="text-muted-foreground">Welcome back</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="My Students" value={stats.students} icon={Users} variant="blue" />
          <StatCard title="Subjects Assigned" value={stats.subjects} icon={BookOpen} variant="indigo" />
          <StatCard
            title="Attendance Today"
            value={stats.attendanceToday ? "Marked" : "Pending"}
            icon={ClipboardCheck}
            variant={stats.attendanceToday ? "emerald" : "amber"}
          />
          <StatCard title="Pending Verifications" value={stats.pendingVerifications} icon={ShieldCheck} variant="amber" />
        </div>
      </div>
    </DashboardLayout>
  );
}
