import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Loader2 } from "lucide-react";

export default function FacultyMarks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [testName, setTestName] = useState("");
  const [marksObtained, setMarksObtained] = useState("");
  const [maxMarks, setMaxMarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("subjects").select("*, courses(name, id, department_id)").eq("faculty_id", user.id)
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
      supabase.from("profiles").select("*").eq("section_id", selectedSection)
        .then(({ data }) => setStudents(data || []));
    }
  }, [selectedSection]);

  const fetchRecords = async (studentId: string) => {
    if (!selectedSubject) return;
    const { data } = await supabase.from("academic_records")
      .select("*").eq("student_id", studentId).eq("subject_id", selectedSubject).order("recorded_at");
    setRecords(data || []);
  };

  const openStudent = (student: any) => {
    setSelectedStudent(student);
    fetchRecords(student.id);
  };

  const addMark = async () => {
    if (!testName.trim() || !marksObtained || !maxMarks || !selectedStudent || !selectedSubject) {
      toast({ title: "Error", description: "Fill all fields", variant: "destructive" }); return;
    }
    setSaving(true);
    const { error } = await supabase.from("academic_records").insert({
      student_id: selectedStudent.id,
      subject_id: selectedSubject,
      test_name: testName.trim(),
      marks_obtained: parseFloat(marksObtained),
      max_marks: parseFloat(maxMarks),
      recorded_by: user!.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marks saved" });
      setTestName(""); setMarksObtained(""); setMaxMarks("");
      fetchRecords(selectedStudent.id);
    }
    setSaving(false);
  };

  const filteredSubjects = subjects.filter(s => !selectedCourse || s.course_id === selectedCourse);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold"><BookOpen className="w-6 h-6 inline mr-2" />Enter Marks</h1>
          <p className="text-muted-foreground">Record student test scores</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="space-y-2 md:col-span-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedSection && selectedSubject && (
          <Card>
            <CardHeader><CardTitle className="font-display">Students</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="font-mono text-sm">{s.username}</TableCell>
                      <TableCell><Button size="sm" onClick={() => openStudent(s)}>View / Add Marks</Button></TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No students in this section</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedStudent} onOpenChange={o => { if (!o) setSelectedStudent(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{selectedStudent?.name} — Records</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {records.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Test</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {records.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>{r.test_name}</TableCell>
                        <TableCell>{r.marks_obtained}/{r.max_marks}</TableCell>
                        <TableCell><Badge variant="secondary">{r.grade}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm">Add New Test Score</h4>
                <Input placeholder="Test name" value={testName} onChange={e => setTestName(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Marks obtained" type="number" value={marksObtained} onChange={e => setMarksObtained(e.target.value)} />
                  <Input placeholder="Max marks" type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} />
                </div>
                <Button onClick={addMark} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Save Marks
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
