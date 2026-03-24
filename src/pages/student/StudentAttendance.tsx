import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StudentAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("attendance").select("*, subjects(name)").eq("student_id", user.id),
      supabase.from("subjects").select("id, name"),
    ]).then(([att, sub]) => {
      setAttendance(att.data || []);
      setSubjects(sub.data || []);
    });
  }, [user]);

  const summary = () => {
    const map = new Map<string, { name: string; total: number; present: number }>();
    attendance.forEach(a => {
      const existing = map.get(a.subject_id) || { name: a.subjects?.name || "Unknown", total: 0, present: 0 };
      existing.total++;
      if (a.status === "present" || a.status === "late") existing.present++;
      map.set(a.subject_id, existing);
    });
    return Array.from(map.values());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Attendance</h1>
        <Card>
          <CardHeader><CardTitle className="font-display">Subject-wise Attendance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Subject</TableHead><TableHead>Attended</TableHead><TableHead>Total</TableHead><TableHead>%</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {summary().map((s, i) => {
                  const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.present}</TableCell>
                      <TableCell>{s.total}</TableCell>
                      <TableCell>{pct}%</TableCell>
                      <TableCell><Badge variant={pct >= 75 ? "secondary" : "destructive"}>{pct >= 75 ? "Safe" : "At Risk"}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {summary().length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No attendance data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
