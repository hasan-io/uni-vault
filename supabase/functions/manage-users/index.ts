import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action } = body;

    // Seed action doesn't require auth
    if (action !== "seed_admin" && action !== "login_with_username") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !caller) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }



    if (action === "seed_admin") {
      // Check if admin already exists
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", "admin")
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, message: "Admin already exists" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const password = "admin@univault";
      const email = "admin@univault.local";

      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: "admin", name: "System Admin" },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        name: "System Admin",
        username: "admin",
      });

      await supabaseAdmin.from("user_roles").insert({
        user_id: authData.user.id,
        role: "admin",
      });

      return new Response(
        JSON.stringify({ success: true, message: "Admin seeded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create_users") {
      const { users, role, created_by } = body;
      // users: Array of { name, username, department_id?, course_id?, section_id?, year? }
      const results: Array<{ name: string; username: string; password: string }> = [];
      const errors: string[] = [];

      for (const u of users) {
        const password = generatePassword();
        const email = `${u.username.toLowerCase().replace(/[^a-z0-9]/g, "")}@univault.local`;

        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username: u.username, name: u.name },
        });

        if (createError) {
          errors.push(`Failed to create ${u.name}: ${createError.message}`);
          continue;
        }

        const userId = authData.user.id;

        // Create profile
        await supabaseAdmin.from("profiles").insert({
          id: userId,
          name: u.name,
          username: u.username,
          department_id: u.department_id || null,
          course_id: u.course_id || null,
          section_id: u.section_id || null,
          year: u.year || null,
          created_by: created_by,
        });

        // Create role
        await supabaseAdmin.from("user_roles").insert({
          user_id: userId,
          role: role,
        });

        results.push({ name: u.name, username: u.username, password });
      }

      return new Response(
        JSON.stringify({ success: true, results, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "toggle_block") {
      const { user_id, is_blocked } = body;

      await supabaseAdmin.from("profiles").update({ is_blocked }).eq("id", user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "login_with_username") {
      const { username, password } = body;

      // Look up username to get email
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, is_blocked, username")
        .eq("username", username)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (profile.is_blocked) {
        return new Response(
          JSON.stringify({ error: "Your account has been suspended. Contact your administrator." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user email from auth
      const { data: { user: authUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

      if (getUserError || !authUser) {
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sign in with email/password using a separate client
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );

      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: authUser.email!,
        password,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, session: signInData.session }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
