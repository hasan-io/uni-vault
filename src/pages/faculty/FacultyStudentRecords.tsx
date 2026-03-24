import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FacultyStudentRecords() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("subjects").select("*, courses(name, id)").eq("faculty_id", user.id)
      .then(({ data }) => {
        setSubjects(data || []);
        const unique = new Map();
        data?.forEach(s => { if (s.courses) unique.set(s.courses.id, s.courses); });
        setCourses(Array.from(unique.values()));
      });
  }, [user]);

  useEffect(() => {
    if (selectedCourse) supabase.from("sections").select("*").eq("course_id", selectedCourse).then(({ data }) => setSections(data || []));
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedSection) supabase.from("profiles").select("*").eq("section_id", selectedSection).then(({ data }) => setStudents(data || []));
  }, [selectedSection]);

  const openStudent = async (student: any) => {
    setSelectedStudent(student);
    const [recs, att] = await Promise.all([
      supabase.from("academic_records").select("*, subjects(name)").eq("student_id", student.id).order("recorded_at"),
      supabase.from("attendance").select("*, subjects(name)").eq("student_id", student.id),
    ]);
    setStudentRecords(recs.data || []);
    setStudentAttendance(att.data || []);
  };

  // Group attendance by subject
  const attendanceSummary = () => {
    const map = new Map<string, { name: string; total: number; present: number }>();
    studentAttendance.forEach(a => {
      const key = a.subject_id;
      const existing = map.get(key) || { name: a.subjects?.name || "Unknown", total: 0, present: 0 };
      existing.total++;
      if (a.status === "present" || a.status === "late") existing.present++;
      map.set(key, existing);
    });
    return Array.from(map.values());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold"><GraduationCap className="w-6 h-6 inline mr-2" />Student Records</h1>
          <p className="text-muted-foreground">View detailed student academic records</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={selectedCourse} onValueChange={v => { setSelectedCourse(v); setSelectedSection(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>Y{s.year} - {s.section_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedSection && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-sm">{s.username}</TableCell>
                      <TableCell><Button size="sm" onClick={() => openStudent(s)}>View Records</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedStudent} onOpenChange={o => { if (!o) setSelectedStudent(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{selectedStudent?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h3 className="font-display font-semibold mb-2">Academic Records</h3>
                {studentRecords.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Test</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {studentRecords.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.subjects?.name}</TableCell>
                          <TableCell>{r.test_name}</TableCell>
                          <TableCell>{r.marks_obtained}/{r.max_marks}</TableCell>
                          <TableCell><Badge variant="secondary">{r.grade}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">No records yet</p>}
              </div>

              <div>
                <h3 className="font-display font-semibold mb-2">Attendance Summary</h3>
                {attendanceSummary().length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Attended</TableHead><TableHead>Total</TableHead><TableHead>%</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {attendanceSummary().map((a, i) => {
                        const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
                        return (
                          <TableRow key={i}>
                            <TableCell>{a.name}</TableCell>
                            <TableCell>{a.present}</TableCell>
                            <TableCell>{a.total}</TableCell>
                            <TableCell>{pct}%</TableCell>
                            <TableCell>
                              <Badge variant={pct >= 75 ? "secondary" : "destructive"}>
                                {pct >= 75 ? "Safe" : "At Risk"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">No attendance data</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
