import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import StatCard from "@/components/StatCard";
import { Users, GraduationCap, Building2, BookOpen } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, faculty: 0, departments: 0, courses: 0 });

  const fetchStats = async () => {
    const [students, faculty, depts, courses] = await Promise.all([
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "faculty"),
      supabase.from("departments").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id", { count: "exact", head: true }),
    ]);
    setStats({
      students: students.count || 0,
      faculty: faculty.count || 0,
      departments: depts.count || 0,
      courses: courses.count || 0,
    });
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your institution</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Students" value={stats.students} icon={GraduationCap} variant="blue" />
          <StatCard title="Total Faculty" value={stats.faculty} icon={Users} variant="indigo" />
          <StatCard title="Departments" value={stats.departments} icon={Building2} variant="emerald" />
          <StatCard title="Courses" value={stats.courses} icon={BookOpen} variant="amber" />
        </div>
      </div>
    </DashboardLayout>
  );
}
