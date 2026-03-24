import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export default function AdminStructure() {
  const { toast } = useToast();
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newDept, setNewDept] = useState("");
  const [newCourse, setNewCourse] = useState({ name: "", department_id: "" });
  const [newSection, setNewSection] = useState({ course_id: "", year: "", section_name: "" });
  const [newSubject, setNewSubject] = useState({ name: "", course_id: "", year: "", faculty_id: "" });

  const fetchAll = async () => {
    setLoading(true);
    const [d, c, sec, sub, facRoles] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase.from("courses").select("*, departments(name)").order("name"),
      supabase.from("sections").select("*, courses(name)").order("year"),
      supabase.from("subjects").select("*, courses(name), profiles!subjects_faculty_id_fkey(name)").order("name"),
      supabase.from("user_roles").select("user_id").eq("role", "faculty"),
    ]);

    setDepartments(d.data || []);
    setCourses(c.data || []);
    setSections(sec.data || []);
    setSubjects(sub.data || []);

    if (facRoles.data && facRoles.data.length > 0) {
      const { data: facProfiles } = await supabase.from("profiles").select("id, name").in("id", facRoles.data.map(f => f.user_id));
      setFaculty(facProfiles || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const addDepartment = async () => {
    if (!newDept.trim()) return;
    const { error } = await supabase.from("departments").insert({ name: newDept.trim() });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Department added" }); setNewDept(""); fetchAll(); }
  };

  const addCourse = async () => {
    if (!newCourse.name.trim() || !newCourse.department_id) return;
    const { error } = await supabase.from("courses").insert({ name: newCourse.name.trim(), department_id: newCourse.department_id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Course added" }); setNewCourse({ name: "", department_id: "" }); fetchAll(); }
  };

  const addSection = async () => {
    if (!newSection.course_id || !newSection.year || !newSection.section_name.trim()) return;
    const { error } = await supabase.from("sections").insert({
      course_id: newSection.course_id,
      year: parseInt(newSection.year),
      section_name: newSection.section_name.trim(),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Section added" }); setNewSection({ course_id: "", year: "", section_name: "" }); fetchAll(); }
  };

  const addSubject = async () => {
    if (!newSubject.name.trim() || !newSubject.course_id || !newSubject.year) return;
    const { error } = await supabase.from("subjects").insert({
      name: newSubject.name.trim(),
      course_id: newSubject.course_id,
      year: parseInt(newSubject.year),
      faculty_id: newSubject.faculty_id || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Subject added" }); setNewSubject({ name: "", course_id: "", year: "", faculty_id: "" }); fetchAll(); }
  };

  const deleteDept = async (id: string) => {
    await supabase.from("departments").delete().eq("id", id);
    toast({ title: "Deleted" }); fetchAll();
  };
  const deleteCourse = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    toast({ title: "Deleted" }); fetchAll();
  };
  const deleteSection = async (id: string) => {
    await supabase.from("sections").delete().eq("id", id);
    toast({ title: "Deleted" }); fetchAll();
  };
  const deleteSubject = async (id: string) => {
    await supabase.from("subjects").delete().eq("id", id);
    toast({ title: "Deleted" }); fetchAll();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Academic Structure</h1>
          <p className="text-muted-foreground">Manage departments, courses, sections & subjects</p>
        </div>

        <Tabs defaultValue="departments">
          <TabsList>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Add Department</CardTitle></CardHeader>
              <CardContent className="flex gap-2">
                <Input placeholder="Department name" value={newDept} onChange={e => setNewDept(e.target.value)} />
                <Button onClick={addDepartment}><Plus className="w-4 h-4 mr-1" />Add</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {departments.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{d.name}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => deleteDept(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {departments.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No departments</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Add Course</CardTitle></CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Input className="flex-1 min-w-[200px]" placeholder="Course name" value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))} />
                <Select value={newCourse.department_id} onValueChange={v => setNewCourse(p => ({ ...p, department_id: v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={addCourse}><Plus className="w-4 h-4 mr-1" />Add</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {courses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.departments?.name}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => deleteCourse(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {courses.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No courses</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Add Section</CardTitle></CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Select value={newSection.course_id} onValueChange={v => setNewSection(p => ({ ...p, course_id: v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Course" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="w-24" placeholder="Year" type="number" value={newSection.year} onChange={e => setNewSection(p => ({ ...p, year: e.target.value }))} />
                <Input className="w-32" placeholder="Section (A, B..)" value={newSection.section_name} onChange={e => setNewSection(p => ({ ...p, section_name: e.target.value }))} />
                <Button onClick={addSection}><Plus className="w-4 h-4 mr-1" />Add</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Year</TableHead><TableHead>Section</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {sections.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.courses?.name}</TableCell>
                        <TableCell>{s.year}</TableCell>
                        <TableCell>{s.section_name}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => deleteSection(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {sections.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No sections</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Add Subject</CardTitle></CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Input className="flex-1 min-w-[200px]" placeholder="Subject name" value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} />
                <Select value={newSubject.course_id} onValueChange={v => setNewSubject(p => ({ ...p, course_id: v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Course" /></SelectTrigger>
                  <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="w-24" placeholder="Year" type="number" value={newSubject.year} onChange={e => setNewSubject(p => ({ ...p, year: e.target.value }))} />
                <Select value={newSubject.faculty_id} onValueChange={v => setNewSubject(p => ({ ...p, faculty_id: v }))}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Faculty (optional)" /></SelectTrigger>
                  <SelectContent>{faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={addSubject}><Plus className="w-4 h-4 mr-1" />Add</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Year</TableHead><TableHead>Faculty</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {subjects.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.courses?.name}</TableCell>
                        <TableCell>{s.year}</TableCell>
                        <TableCell>{s.profiles?.name || "Unassigned"}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => deleteSubject(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {subjects.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No subjects</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
