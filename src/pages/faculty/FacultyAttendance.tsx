import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Loader2 } from "lucide-react";

type AttendanceStatus = "present" | "absent" | "late";

export default function FacultyAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("subjects").select("*, courses(name, id)").eq("faculty_id", user.id)
      .then(({ data }) => {
        setSubjects(data || []);
        const uniqueCourses = new Map();
        data?.forEach(s => { if (s.courses) uniqueCourses.set(s.courses.id, s.courses); });
        setCourses(Array.from(uniqueCourses.values()));
      });
  }, [user]);

  useEffect(() => {
    if (selectedCourse) {
      supabase.from("sections").select("*").eq("course_id", selectedCourse).then(({ data }) => setSections(data || []));
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedSection) {
      supabase.from("profiles").select("*").eq("section_id", selectedSection).then(({ data }) => {
        setStudents(data || []);
        const map: Record<string, AttendanceStatus> = {};
        (data || []).forEach(s => { map[s.id] = "present"; });
        setAttendanceMap(map);
      });
    }
  }, [selectedSection]);

  // Load existing attendance for date
  useEffect(() => {
    if (selectedSubject && selectedDate && students.length > 0) {
      supabase.from("attendance")
        .select("*")
        .eq("subject_id", selectedSubject)
        .eq("date", selectedDate)
        .in("student_id", students.map(s => s.id))
        .then(({ data }) => {
          setExistingAttendance(data || []);
          if (data && data.length > 0) {
            const map: Record<string, AttendanceStatus> = {};
            students.forEach(s => { map[s.id] = "present"; });
            data.forEach(a => { map[a.student_id] = a.status as AttendanceStatus; });
            setAttendanceMap(map);
          }
        });
    }
  }, [selectedSubject, selectedDate, students]);

  const isFutureDate = new Date(selectedDate) > new Date();

  const submitAttendance = async () => {
    if (isFutureDate) {
      toast({ title: "Error", description: "Cannot mark attendance for future dates", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Check if editing existing (within 24h)
    if (existingAttendance.length > 0) {
      const firstRecord = existingAttendance[0];
      const markedTime = new Date(firstRecord.marked_at).getTime();
      const now = Date.now();
      if (now - markedTime > 24 * 60 * 60 * 1000) {
        toast({ title: "Error", description: "Can only edit attendance within 24 hours", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const records = students.map(s => ({
      student_id: s.id,
      subject_id: selectedSubject,
      date: selectedDate,
      status: attendanceMap[s.id] || "present",
      marked_by: user!.id,
    }));

    // Upsert
    const { error } = await supabase.from("attendance").upsert(records, {
      onConflict: "student_id,subject_id,date",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Attendance saved" });
    }
    setSaving(false);
  };

  const toggleStatus = (studentId: string) => {
    setAttendanceMap(prev => {
      const current = prev[studentId];
      const next: AttendanceStatus = current === "present" ? "absent" : current === "absent" ? "late" : "present";
      return { ...prev, [studentId]: next };
    });
  };

  const statusColors: Record<string, string> = {
    present: "bg-success/10 text-success border-success/20",
    absent: "bg-destructive/10 text-destructive border-destructive/20",
    late: "bg-warning/10 text-warning border-warning/20",
  };

  const filteredSubjects = subjects.filter(s => !selectedCourse || s.course_id === selectedCourse);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold"><ClipboardCheck className="w-6 h-6 inline mr-2" />Mark Attendance</h1>
          <p className="text-muted-foreground">Record daily attendance for your classes</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={selectedCourse} onValueChange={v => { setSelectedCourse(v); setSelectedSection(""); setSelectedSubject(""); }}>
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
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Date</Label>
                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedSection && selectedSubject && students.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Student Attendance</CardTitle>
              <Button onClick={submitAttendance} disabled={saving || isFutureDate}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Submit Attendance
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-sm">{s.username}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleStatus(s.id)}
                          className={`px-3 py-1 rounded-full border text-xs font-medium capitalize cursor-pointer transition-colors ${statusColors[attendanceMap[s.id] || "present"]}`}
                        >
                          {attendanceMap[s.id] || "present"}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
