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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Download, Loader2, Shield, ShieldOff } from "lucide-react";

export default function FacultyCredentials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [studentNames, setStudentNames] = useState("");
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<any[] | null>(null);
  const [myStudents, setMyStudents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("courses").select("*, departments:department_id(id, name)").order("name").then(({ data }) => setCourses(data || []));
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      supabase.from("sections").select("*").eq("course_id", selectedCourse).order("section_name")
        .then(({ data }) => setSections(data || []));
    }
  }, [selectedCourse]);

  const fetchMyStudents = async () => {
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    if (!roles?.length) { setMyStudents([]); return; }
    const { data } = await supabase.from("profiles").select("*, courses(name), sections(section_name, year)")
      .in("id", roles.map(r => r.user_id)).eq("created_by", user.id);
    setMyStudents(data || []);
  };

  useEffect(() => { fetchMyStudents(); }, [user]);

  const generateCredentials = async () => {
    if (!selectedCourse || !selectedSection || !studentNames.trim()) {
      toast({ title: "Error", description: "Fill all fields", variant: "destructive" }); return;
    }
    setCreating(true);

    const section = sections.find(s => s.id === selectedSection);
    const course = courses.find(c => c.id === selectedCourse);
    const names = studentNames.split("\n").map(line => line.trim()).filter(Boolean);

    const users = names.map((name, i) => {
      const parts = name.split(",").map(p => p.trim());
      const studentName = parts[0];
      const count = myStudents.length + i + 1;
      const courseCode = (course?.name || "X").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4);
      const username = `STU-${courseCode}-${section?.year || new Date().getFullYear()}-${String(count).padStart(3, "0")}`;
      return {
        name: studentName,
        username,
        course_id: selectedCourse,
        section_id: selectedSection,
        department_id: course?.departments?.id || course?.department_id || null,
        year: section?.year || null,
      };
    });

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "create_users", users, role: "student", created_by: user?.id },
    });

    if (error || data?.errors?.length) {
      toast({ title: "Error", description: data?.errors?.[0] || "Failed", variant: "destructive" });
    } else {
      setCredentials(data.results);
      toast({ title: "Success", description: `${data.results.length} students created` });
      fetchMyStudents();
    }
    setCreating(false);
  };

  const downloadCredentials = () => {
    if (!credentials) return;
    const content = credentials.map(c => `Name: ${c.name}\nUsername: ${c.username}\nPassword: ${c.password}\n---`).join("\n");
    const blob = new Blob([`UniVault Student Credentials\n${"=".repeat(30)}\n\n${content}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "student-credentials.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleBlock = async (userId: string, blocked: boolean) => {
    await supabase.functions.invoke("manage-users", {
      body: { action: "toggle_block", user_id: userId, is_blocked: !blocked },
    });
    toast({ title: blocked ? "Unblocked" : "Blocked" });
    fetchMyStudents();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Credential Management</h1>
          <p className="text-muted-foreground">Generate student login credentials</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display"><KeyRound className="w-5 h-5 inline mr-2" />Generate Credentials</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {credentials ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Credentials generated! Save them now:</p>
                {credentials.map((c, i) => (
                  <div key={i} className="p-3 bg-muted rounded-lg text-sm font-mono">
                    {c.name} — {c.username} — <code>{c.password}</code>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={downloadCredentials}><Download className="w-4 h-4 mr-2" />Download</Button>
                  <Button variant="outline" onClick={() => { setCredentials(null); setStudentNames(""); }}>Generate More</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Select value={selectedCourse} onValueChange={v => { setSelectedCourse(v); setSelectedSection(""); }}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>Year {s.year} - {s.section_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Student Names (one per line)</Label>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={"John Doe\nJane Smith\nAlex Johnson"}
                    value={studentNames}
                    onChange={e => setStudentNames(e.target.value)}
                  />
                </div>
                <Button onClick={generateCredentials} disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Generate Credentials
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">My Students ({myStudents.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Course</TableHead>
                  <TableHead>Section</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myStudents.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-sm">{s.username}</TableCell>
                    <TableCell>{s.courses?.name || "—"}</TableCell>
                    <TableCell>{s.sections?.section_name || "—"}</TableCell>
                    <TableCell><Badge variant={s.is_blocked ? "destructive" : "secondary"}>{s.is_blocked ? "Blocked" : "Active"}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => toggleBlock(s.id, s.is_blocked)}>
                        {s.is_blocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {myStudents.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No students generated yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
