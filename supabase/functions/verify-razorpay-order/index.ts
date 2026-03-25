import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fee_payment_id } = await req.json();
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keySecret) {
      return new Response(JSON.stringify({ success: false, error: "Server config error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // HMAC SHA256 verification
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(keySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${razorpay_order_id}|${razorpay_payment_id}`));
    const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (expectedSig !== razorpay_signature) {
      return new Response(JSON.stringify({ success: false, error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update payment record
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await supabaseAdmin.from("fee_payments").update({
      status: "paid",
      razorpay_order_id,
      razorpay_payment_id,
      payment_mode: "razorpay",
      paid_at: new Date().toISOString(),
    }).eq("id", fee_payment_id);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
