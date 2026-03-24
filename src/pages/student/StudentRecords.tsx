import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, Award } from "lucide-react";

export default function StudentRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("academic_records")
      .select("*, subjects(name)")
      .eq("student_id", user.id)
      .order("recorded_at", { ascending: false })
      .then(({ data }) => setRecords(data || []));
  }, [user]);

  // Group by subject
  const grouped = records.reduce((acc, r) => {
    const name = r.subjects?.name || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  // Overall average
  const overallAvg = (() => {
    let total = 0, count = 0;
    records.forEach(r => {
      if (r.max_marks > 0) { total += (r.marks_obtained / r.max_marks) * 100; count++; }
    });
    return count > 0 ? Math.round(total / count) : 0;
  })();

  const gradeColor = (grade: string) => {
    if (grade === "A") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (grade === "B") return "bg-blue-100 text-blue-700 border-blue-200";
    if (grade === "C") return "bg-amber-100 text-amber-700 border-amber-200";
    if (grade === "D") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const avgColor = (avg: number) => {
    if (avg >= 75) return "text-emerald-600";
    if (avg >= 50) return "text-amber-600";
    return "text-red-500";
  };

  const subjects = Object.entries(grouped);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-display font-bold">
              <BookOpen className="w-7 h-7 inline mr-2 text-primary" />
              Academic Records
            </h1>
            <p className="text-muted-foreground">Your subject-wise performance overview</p>
          </div>
        </div>

        {/* Summary Cards */}
        {records.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-t-[3px] border-t-primary">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className={`text-2xl font-display font-bold ${avgColor(overallAvg)}`}>{overallAvg}%</p>
                  <p className="text-xs text-muted-foreground">Overall Average</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-t-[3px] border-t-indigo-500">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-indigo-500">{subjects.length}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-t-[3px] border-t-emerald-500">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Award className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-emerald-500">{records.length}</p>
                  <p className="text-xs text-muted-foreground">Total Assessments</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subject Cards */}
        {subjects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No academic records yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your marks will appear here once faculty uploads them</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {subjects.map(([subject, tests]) => {
              const subAvg = Math.round(
                (tests as any[]).reduce((acc, t: any) => acc + (t.marks_obtained / t.max_marks) * 100, 0) / (tests as any[]).length
              );
              const topGrade = (tests as any[]).sort((a: any, b: any) => b.marks_obtained - a.marks_obtained)[0]?.grade;

              return (
                <Card key={subject} className="overflow-hidden">
                  {/* Subject Header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-muted/30 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-sm">{subject}</h3>
                        <p className="text-xs text-muted-foreground">{(tests as any[]).length} assessment{(tests as any[]).length > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-lg font-display font-bold ${avgColor(subAvg)}`}>{subAvg}%</p>
                        <p className="text-xs text-muted-foreground">avg</p>
                      </div>
                      {topGrade && (
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold border-2 ${gradeColor(topGrade)}`}>
                          {topGrade}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Test Rows */}
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/40">
                      {(tests as any[]).map((r: any, idx: number) => {
                        const pct = Math.round((r.marks_obtained / r.max_marks) * 100);
                        return (
                          <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] text-muted-foreground font-medium">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-medium">{r.test_name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              {/* Progress bar */}
                              <div className="hidden md:flex items-center gap-2">
                                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                              </div>
                              <span className="text-sm font-medium tabular-nums">
                                {r.marks_obtained}
                                <span className="text-muted-foreground">/{r.max_marks}</span>
                              </span>
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${gradeColor(r.grade)}`}>
                                {r.grade}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}