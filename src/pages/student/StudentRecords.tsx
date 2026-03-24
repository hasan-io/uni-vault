import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StudentRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("academic_records").select("*, subjects(name)").eq("student_id", user.id).order("recorded_at", { ascending: false })
      .then(({ data }) => setRecords(data || []));
  }, [user]);

  // Group by subject
  const grouped = records.reduce((acc, r) => {
    const name = r.subjects?.name || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold">Academic Records</h1>
        {Object.entries(grouped).map(([subject, tests]) => (
          <Card key={subject}>
            <CardHeader><CardTitle className="font-display text-lg">{subject}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(tests as any[]).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.test_name}</TableCell>
                      <TableCell>{r.marks_obtained}/{r.max_marks}</TableCell>
                      <TableCell><Badge variant="secondary">{r.grade}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {records.length === 0 && <p className="text-muted-foreground text-center py-12">No academic records yet.</p>}
      </div>
    </DashboardLayout>
  );
}
