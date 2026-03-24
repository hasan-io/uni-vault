import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  course_name: string;
  year: number;
  section_name: string;
  score: number;
  course_id: string;
  section_id: string;
}

export default function StudentLeaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [filtered, setFiltered] = useState<LeaderboardEntry[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [filterCourse, setFilterCourse] = useState("");
  const [filterYear, setFilterYear] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: lb }, { data: c }] = await Promise.all([
        (supabase as any).rpc("get_leaderboard"),
        supabase.from("courses").select("id, name"),
      ]);
      setData(lb || []);
      setFiltered(lb || []);
      setCourses(c || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = data;
    if (filterCourse) result = result.filter(r => r.course_id === filterCourse);
    if (filterYear) result = result.filter(r => r.year === parseInt(filterYear));
    setFiltered(result);
  }, [filterCourse, filterYear, data]);

  const rankColors = ["", "bg-amber-400/20 border-amber-400/50", "bg-gray-300/20 border-gray-300/50", "bg-amber-700/20 border-amber-700/50"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold"><Trophy className="w-7 h-7 inline mr-2 text-warning" />Leaderboard</h1>
          <p className="text-muted-foreground">Engagement rankings across students</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Select value={filterCourse} onValueChange={v => setFilterCourse(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Courses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={v => setFilterYear(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="All Years" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {[1, 2, 3, 4].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                    <th className="px-6 py-3 text-left font-medium">Rank</th>
                    <th className="px-6 py-3 text-left font-medium">Student</th>
                    <th className="px-6 py-3 text-left font-medium">Course</th>
                    <th className="px-6 py-3 text-left font-medium">Year</th>
                    <th className="px-6 py-3 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, i) => {
                    const isMe = entry.student_id === user?.id;
                    const rank = i + 1;
                    return (
                      <tr
                        key={entry.student_id}
                        className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${isMe ? "bg-primary/5 border-l-2 border-l-primary" : ""} ${rank <= 3 ? rankColors[rank] : ""}`}
                      >
                        <td className="px-6 py-3 font-display font-bold">
                          {rank <= 3 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Medal className={`w-5 h-5 ${rank === 1 ? "text-amber-500" : rank === 2 ? "text-gray-400" : "text-amber-700"}`} />
                              #{rank}
                            </span>
                          ) : `#${rank}`}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">{entry.student_name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                            <span className="font-medium">{entry.student_name} {isMe && <span className="text-primary text-xs">(You)</span>}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">{entry.course_name || "—"}</td>
                        <td className="px-6 py-3 text-muted-foreground">{entry.year || "—"}</td>
                        <td className="px-6 py-3 text-right font-display font-bold text-lg">{entry.score}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted-foreground py-12">No students found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}
