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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, ShieldOff, Loader2, Download } from "lucide-react";

export default function AdminUserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [faculty, setFaculty] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFacultyOpen, setAddFacultyOpen] = useState(false);
  const [newFaculty, setNewFaculty] = useState({ name: "", department_id: "", course_id: "" });
  const [creating, setCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any[] | null>(null);

  // Filters for students
  const [filterDept, setFilterDept] = useState("");
  const [filterCourse, setFilterCourse] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [facRes, stuRes, deptRes, courseRes] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "faculty"),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
      supabase.from("departments").select("*").order("name"),
      supabase.from("courses").select("*, departments(name)").order("name"),
    ]);

    const facIds = (facRes.data || []).map(f => f.user_id);
    const stuIds = (stuRes.data || []).map(s => s.user_id);

    if (facIds.length > 0) {
      const { data } = await supabase.from("profiles").select("*, departments(name), courses(name)").in("id", facIds);
      setFaculty(data || []);
    } else setFaculty([]);

    if (stuIds.length > 0) {
      const { data } = await supabase.from("profiles").select("*, departments(name), courses(name), sections(section_name, year)").in("id", stuIds);
      setStudents(data || []);
    } else setStudents([]);

    setDepartments(deptRes.data || []);
    setCourses(courseRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredCourses = newFaculty.department_id
    ? courses.filter(c => c.department_id === newFaculty.department_id) : courses;

  const filteredStudents = students.filter(s => {
    if (filterDept && s.department_id !== filterDept) return false;
    if (filterCourse && s.course_id !== filterCourse) return false;
    return true;
  });

  const handleCreateFaculty = async () => {
    if (!newFaculty.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const year = new Date().getFullYear();
    const count = faculty.length + 1;
    const username = `FAC-${year}-${String(count).padStart(3, "0")}`;

    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: {
        action: "create_users",
        users: [{
          name: newFaculty.name,
          username,
          department_id: newFaculty.department_id || null,
          course_id: newFaculty.course_id || null,
        }],
        role: "faculty",
        created_by: user?.id,
      },
    });

    if (error || data?.errors?.length) {
      toast({ title: "Error", description: data?.errors?.[0] || "Failed to create", variant: "destructive" });
    } else {
      setCreatedCredentials(data.results);
      toast({ title: "Success", description: "Faculty created successfully" });
      fetchData();
    }
    setCreating(false);
  };

  const toggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    const { error } = await supabase.functions.invoke("manage-users", {
      body: { action: "toggle_block", user_id: userId, is_blocked: !currentlyBlocked },
    });
    if (!error) {
      toast({ title: "Success", description: currentlyBlocked ? "User unblocked" : "User blocked" });
      fetchData();
    }
  };

  const downloadCredentialsPDF = () => {
    if (!createdCredentials) return;
    const content = createdCredentials.map(c =>
      `Name: ${c.name}\nUsername: ${c.username}\nPassword: ${c.password}\n---`
    ).join("\n");
    const blob = new Blob([`UniVault Credentials\n${"=".repeat(30)}\n\n${content}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faculty-credentials.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage faculty and student accounts</p>
          </div>
        </div>

        <Tabs defaultValue="faculty">
          <TabsList>
            <TabsTrigger value="faculty">Faculty ({faculty.length})</TabsTrigger>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="faculty" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addFacultyOpen} onOpenChange={(o) => { setAddFacultyOpen(o); if (!o) setCreatedCredentials(null); }}>
                <DialogTrigger asChild>
                  <Button><UserPlus className="w-4 h-4 mr-2" />Add Faculty</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Add Faculty Member</DialogTitle>
                  </DialogHeader>
                  {createdCredentials ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">Faculty created! Save these credentials:</p>
                      {createdCredentials.map((c, i) => (
                        <Card key={i}>
                          <CardContent className="p-4 space-y-1">
                            <p><strong>Name:</strong> {c.name}</p>
                            <p><strong>Username:</strong> {c.username}</p>
                            <p><strong>Password:</strong> <code className="bg-muted px-2 py-0.5 rounded">{c.password}</code></p>
                          </CardContent>
                        </Card>
                      ))}
                      <Button onClick={downloadCredentialsPDF} className="w-full">
                        <Download className="w-4 h-4 mr-2" />Download Credentials
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={newFaculty.name} onChange={e => setNewFaculty(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={newFaculty.department_id} onValueChange={v => setNewFaculty(p => ({ ...p, department_id: v, course_id: "" }))}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Course</Label>
                        <Select value={newFaculty.course_id} onValueChange={v => setNewFaculty(p => ({ ...p, course_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                          <SelectContent>
                            {filteredCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateFaculty} disabled={creating} className="w-full">
                        {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create Faculty
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faculty.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="font-mono text-sm">{f.username}</TableCell>
                        <TableCell>{f.departments?.name || "—"}</TableCell>
                        <TableCell>{f.courses?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={f.is_blocked ? "destructive" : "secondary"}>
                            {f.is_blocked ? "Blocked" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => toggleBlock(f.id, f.is_blocked)}>
                            {f.is_blocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {faculty.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No faculty members yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Select value={filterDept} onValueChange={v => { setFilterDept(v === "all" ? "" : v); setFilterCourse(""); }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCourse} onValueChange={v => setFilterCourse(v === "all" ? "" : v)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All Courses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {(filterDept ? courses.filter(c => c.department_id === filterDept) : courses).map(c =>
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono text-sm">{s.username}</TableCell>
                        <TableCell>{s.courses?.name || "—"}</TableCell>
                        <TableCell>{s.year || "—"}</TableCell>
                        <TableCell>{s.sections?.section_name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_blocked ? "destructive" : "secondary"}>
                            {s.is_blocked ? "Blocked" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => toggleBlock(s.id, s.is_blocked)}>
                            {s.is_blocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No students found</TableCell></TableRow>
                    )}
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
