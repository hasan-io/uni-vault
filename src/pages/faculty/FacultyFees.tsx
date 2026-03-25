import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CheckCircle2, Clock } from "lucide-react";
import StatCard from "@/components/StatCard";

export default function FacultyFees() {
  const [courses, setCourses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [filterCourse, setFilterCourse] = useState("");
  const [filterYear, setFilterYear] = useState("");

  useEffect(() => {
    supabase.from("courses").select("*").then(({ data }) => setCourses(data || []));
    (supabase as any).from("fee_payments")
      .select("*, profiles:student_id(name, course_id, year), fee_structures:fee_structure_id(label, due_date, course_id, year)")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setPayments(data || []));
  }, []);

  const filtered = payments.filter((p: any) => {
    if (filterCourse && p.fee_structures?.course_id !== filterCourse) return false;
    if (filterYear && p.fee_structures?.year !== parseInt(filterYear)) return false;
    return true;
  });

  const paidCount = filtered.filter((p: any) => p.status === "paid").length;
  const unpaidCount = filtered.filter((p: any) => p.status === "unpaid").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold"><DollarSign className="w-7 h-7 inline mr-2 text-primary" />Student Fees</h1>
          <p className="text-muted-foreground">View student fee payment status</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Paid" value={paidCount} icon={CheckCircle2} variant="emerald" />
          <StatCard title="Unpaid" value={unpaidCount} icon={Clock} variant="amber" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3 items-center">
              <CardTitle className="font-display">Fee Records</CardTitle>
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
                </tr></thead>
                <tbody>
                  {filtered.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{p.profiles?.name}</td>
                      <td className="p-3">{p.fee_structures?.label}</td>
                      <td className="p-3">₹{Number(p.amount).toLocaleString()}</td>
                      <td className="p-3">{p.fee_structures?.due_date ? new Date(p.fee_structures.due_date).toLocaleDateString() : "—"}</td>
                      <td className="p-3"><Badge variant={p.status === "paid" ? "success" : "destructive"}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="text-center text-muted-foreground py-6">No records found</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
