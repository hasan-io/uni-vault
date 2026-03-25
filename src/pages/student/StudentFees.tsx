import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AIChatbot from "@/components/AIChatbot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Download, Loader2 } from "lucide-react";

declare global {
  interface Window { Razorpay: any; }
}

export default function StudentFees() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("fee_payments")
      .select("*, fee_structures:fee_structure_id(label, due_date, course_id, year)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("my-fees").on("postgres_changes", { event: "*", schema: "public", table: "fee_payments", filter: `student_id=eq.${user.id}` }, () => fetchPayments()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handlePay = async (payment: any) => {
    setPaying(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: Number(payment.amount), fee_payment_id: payment.id, student_id: user?.id },
      });

      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || "Failed to create order", variant: "destructive" });
        setPaying(null);
        return;
      }

      const options = {
        key: "rzp_live_SVMfCsl4Dn21R4",
        amount: data.amount,
        currency: data.currency,
        name: "UniVault",
        description: payment.fee_structures?.label || "Fee Payment",
        order_id: data.order_id,
        prefill: { name: profile?.name || "", email: user?.email || "" },
        handler: async (response: any) => {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              fee_payment_id: payment.id,
            },
          });

          if (verifyError || !verifyData?.success) {
            toast({ title: "Verification failed", description: "Contact admin", variant: "destructive" });
          } else {
            toast({ title: "Payment successful!", description: "Your fee has been paid" });
          }
          fetchPayments();
          setPaying(null);
        },
        modal: { ondismiss: () => setPaying(null) },
        theme: { color: "#3B82F6" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast({ title: "Payment failed", description: "Please try again", variant: "destructive" });
        setPaying(null);
      });
      rzp.open();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setPaying(null);
    }
  };

  const downloadReceipt = (payment: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt</title><style>
        body { font-family: Inter, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
        h1 { color: #0F172A; border-bottom: 3px solid #3B82F6; padding-bottom: 12px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .stamp { text-align: center; margin-top: 30px; padding: 16px; border: 3px solid #10B981; border-radius: 12px; color: #10B981; font-size: 20px; font-weight: bold; }
      </style></head><body>
        <h1>🎓 UniVault - Payment Receipt</h1>
        <div class="row"><span>Student Name</span><strong>${profile?.name}</strong></div>
        <div class="row"><span>Fee Label</span><strong>${payment.fee_structures?.label}</strong></div>
        <div class="row"><span>Amount</span><strong>₹${Number(payment.amount).toLocaleString()}</strong></div>
        <div class="row"><span>Payment ID</span><strong>${payment.razorpay_payment_id || "N/A"}</strong></div>
        <div class="row"><span>Payment Mode</span><strong>${payment.payment_mode || "Online"}</strong></div>
        <div class="row"><span>Date</span><strong>${payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "N/A"}</strong></div>
        <div class="stamp">✓ PAYMENT SUCCESSFUL</div>
        <script>setTimeout(() => window.print(), 500);</script>
      </body></html>
    `);
    w.document.close();
  };

  const pending = payments.filter(p => p.status === "unpaid");
  const paid = payments.filter(p => p.status === "paid");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-display font-bold"><DollarSign className="w-7 h-7 inline mr-2 text-primary" />My Fees</h1>
          <p className="text-muted-foreground">View and pay your fees online</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display">Pending Fees ({pending.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : pending.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No pending fees 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Fee Label</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Due Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Action</th>
                  </tr></thead>
                  <tbody>
                    {pending.map((p: any) => (
                      <tr key={p.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{p.fee_structures?.label}</td>
                        <td className="p-3">₹{Number(p.amount).toLocaleString()}</td>
                        <td className="p-3">{p.fee_structures?.due_date ? new Date(p.fee_structures.due_date).toLocaleDateString() : "—"}</td>
                        <td className="p-3"><Badge variant="destructive">Unpaid</Badge></td>
                        <td className="p-3">
                          <Button size="sm" onClick={() => handlePay(p)} disabled={paying === p.id}>
                            {paying === p.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Pay Now
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {paid.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="font-display">Payment History ({paid.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">S.No</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Payment ID</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Mode</th>
                    <th className="text-left p-3 font-medium text-muted-foreground uppercase text-xs">Receipt</th>
                  </tr></thead>
                  <tbody>
                    {paid.map((p: any, i: number) => (
                      <tr key={p.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                        <td className="p-3 font-mono text-xs">{p.razorpay_payment_id || "—"}</td>
                        <td className="p-3">₹{Number(p.amount).toLocaleString()}</td>
                        <td className="p-3">{p.payment_mode || "—"}</td>
                        <td className="p-3"><Button size="sm" variant="outline" onClick={() => downloadReceipt(p)}><Download className="w-3 h-3 mr-1" />Receipt</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <AIChatbot />
    </DashboardLayout>
  );
}
