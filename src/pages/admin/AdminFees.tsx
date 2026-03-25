import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Loader2, Trash2, IndianRupee, Clock, Users } from "lucide-react";
import StatCard from "@/components/StatCard";

export default function AdminFees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ course_id: "", year: "", label: "", amount: "", due_date: "" });

  // Filters for payments tab
  const [filterCourse, setFilterCourse] = useState("");
  const [filterYear, setFilterYear] = useState("");

  useEffect(() => {
    fetchCourses();
    fetchStructures();
    fetchPayments();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*");
    setCourses(data || []);
  };

  const fetchStructures = async () => {
    const { data } = await (supabase as any).from("fee_structures").select("*, courses(name)").order("created_at", { ascending: false });
    setStructures(data || []);
  };

  const fetchPayments = async () => {
    const { data } = await (supabase as any).from("fee_payments").select("*, profiles:student_id(name, course_id, section_id, year), fee_structures:fee_structure_id(label, due_date, course_id, year)").order("created_at", { ascending: false });
    setPayments(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id || !form.year || !form.label || !form.amount) {
      toast({ title: "Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Insert fee structure
    const { data: fs, error } = await (supabase as any).from("fee_structures").insert({
      course_id: form.course_id,
      year: parseInt(form.year),
      label: form.label.trim(),
      amount: parseFloat(form.amount),
      due_date: form.due_date || null,
      created_by: user?.id,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Get all students in that course + year
    const { data: studentRoles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    if (studentRoles) {
      const studentIds = studentRoles.map((r: any) => r.user_id);
      const { data: students } = await supabase.from("profiles").select("id").in("id", studentIds).eq("course_id", form.course_id).eq("year", parseInt(form.year));

      if (students && students.length > 0) {
        const paymentRecords = students.map((s: any) => ({
          student_id: s.id,
          fee_structure_id: fs.id,
          amount: parseFloat(form.amount),
          status: "unpaid",
        }));
        await (supabase as any).from("fee_payments").insert(paymentRecords);
      }
    }

    toast({ title: "Fee structure created", description: `Payment records generated for students` });
    setForm({ course_id: "", year: "", label: "", amount: "", due_date: "" });
    fetchStructures();
    fetchPayments();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("fee_structures").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchStructures();
    fetchPayments();
  };

  const filteredPayments = payments.filter((p: any) => {
    if (filterCourse && p.fee_structures?.course_id !== filterCourse) return false;
    if (filterYear && p.fee_structures?.year !== parseInt(filterYear)) return false;
    return true;
  });

  const totalCollected = filteredPayments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalPending = filteredPayments.filter((p: any) => p.status === "unpaid").reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold"><DollarSign className="w-7 h-7 inline mr-2 text-primary" />Fees Management</h1>
          <p className="text-muted-foreground">Create fee structures and track payments</p>
        </div>

        <Tabs defaultValue="structures">
          <TabsList>
            <TabsTrigger value="structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="payments">Payment Records</TabsTrigger>
          </TabsList>

          <TabsContent value="structures" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="font-display">Create Fee Structure</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={form.course_id} onValueChange={v => setForm(p => ({ ...p, course_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select value={form.year} onValueChange={v => setForm(p => ({ ...p, year: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>{[1,2,3,4].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fee Label *</Label>
                    <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. College Fees" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹) *</Label>
                    <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Create Fee Structure
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display">All Fee Structures</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Course</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Year</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Label</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Due Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Actions</th>
                    </tr></thead>
                    <tbody>
                      {structures.map((s: any) => (
                        <tr key={s.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">{s.courses?.name}</td>
                          <td className="p-3">{s.year}</td>
                          <td className="p-3 font-medium">{s.label}</td>
                          <td className="p-3">₹{Number(s.amount).toLocaleString()}</td>
                          <td className="p-3">{s.due_date ? new Date(s.due_date).toLocaleDateString() : "—"}</td>
                          <td className="p-3"><Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-3 h-3" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {structures.length === 0 && <p className="text-center text-muted-foreground py-6">No fee structures created yet</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Total Collected" value={`₹${totalCollected.toLocaleString()}`} icon={IndianRupee} variant="emerald" />
              <StatCard title="Total Pending" value={`₹${totalPending.toLocaleString()}`} icon={Clock} variant="amber" />
              <StatCard title="Total Students" value={filteredPayments.length} icon={Users} variant="blue" />
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap gap-3 items-center">
                  <CardTitle className="font-display">Payment Records</CardTitle>
                  <Select value={filterCourse} onValueChange={setFilterCourse}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="All Courses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="w-32"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {[1,2,3,4].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Student</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Fee Label</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Due Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Paid On</th>
                    </tr></thead>
                    <tbody>
                      {filteredPayments.map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{p.profiles?.name}</td>
                          <td className="p-3">{p.fee_structures?.label}</td>
                          <td className="p-3">₹{Number(p.amount).toLocaleString()}</td>
                          <td className="p-3">{p.fee_structures?.due_date ? new Date(p.fee_structures.due_date).toLocaleDateString() : "—"}</td>
                          <td className="p-3"><Badge variant={p.status === "paid" ? "success" : "destructive"}>{p.status}</Badge></td>
                          <td className="p-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPayments.length === 0 && <p className="text-center text-muted-foreground py-6">No payment records</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
