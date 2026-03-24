import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log: string[] = [];
    const push = (msg: string) => { log.push(msg); console.log(msg); };

    // Helper to create a user
    async function createUser(name: string, username: string, password: string, role: string, extra: Record<string, any> = {}) {
      const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@univault.local`;
      
      // Check if exists
      const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("username", username).single();
      if (existing) {
        push(`User ${username} already exists, skipping`);
        return existing.id;
      }

      const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { username, name },
      });
      if (error) { push(`ERROR creating ${username}: ${error.message}`); return null; }
      
      const userId = authData.user.id;
      await supabaseAdmin.from("profiles").insert({ id: userId, name, username, ...extra });
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
      push(`Created ${role}: ${name} (${username})`);
      return userId;
    }

    // ========= DEPARTMENTS =========
    push("--- Creating Departments ---");
    const { data: deptCS } = await supabaseAdmin.from("departments").upsert({ name: "Computer Science" }, { onConflict: "name" }).select().single();
    const { data: deptBA } = await supabaseAdmin.from("departments").upsert({ name: "Business Administration" }, { onConflict: "name" }).select().single();
    
    // If upsert doesn't work due to no unique constraint, try insert-or-select
    let csId: string, baId: string;
    if (deptCS) { csId = deptCS.id; } else {
      const { data: d } = await supabaseAdmin.from("departments").select("id").eq("name", "Computer Science").single();
      if (d) csId = d.id; else {
        const { data: n } = await supabaseAdmin.from("departments").insert({ name: "Computer Science" }).select().single();
        csId = n!.id;
      }
    }
    if (deptBA) { baId = deptBA.id; } else {
      const { data: d } = await supabaseAdmin.from("departments").select("id").eq("name", "Business Administration").single();
      if (d) baId = d.id; else {
        const { data: n } = await supabaseAdmin.from("departments").insert({ name: "Business Administration" }).select().single();
        baId = n!.id;
      }
    }
    push(`Departments: CS=${csId!}, BA=${baId!}`);

    // ========= COURSES =========
    push("--- Creating Courses ---");
    async function getOrCreateCourse(name: string, dept_id: string) {
      const { data: existing } = await supabaseAdmin.from("courses").select("id").eq("name", name).single();
      if (existing) return existing.id;
      const { data } = await supabaseAdmin.from("courses").insert({ name, department_id: dept_id }).select().single();
      return data!.id;
    }
    const bcaId = await getOrCreateCourse("BCA", csId!);
    const bbaId = await getOrCreateCourse("BBA", baId!);
    push(`Courses: BCA=${bcaId}, BBA=${bbaId}`);

    // ========= SECTIONS =========
    push("--- Creating Sections ---");
    async function getOrCreateSection(course_id: string, year: number, section_name: string) {
      const { data: existing } = await supabaseAdmin.from("sections").select("id").eq("course_id", course_id).eq("year", year).eq("section_name", section_name).single();
      if (existing) return existing.id;
      const { data } = await supabaseAdmin.from("sections").insert({ course_id, year, section_name }).select().single();
      return data!.id;
    }
    const bcaY1A = await getOrCreateSection(bcaId, 1, "A");
    const bcaY1B = await getOrCreateSection(bcaId, 1, "B");
    const bcaY2A = await getOrCreateSection(bcaId, 2, "A");
    const bbaY1A = await getOrCreateSection(bbaId, 1, "A");
    push(`Sections created: BCA Y1A, Y1B, Y2A, BBA Y1A`);

    // ========= FACULTY =========
    push("--- Creating Faculty ---");
    const fac1 = await createUser("Rajesh Kumar", "FAC-2024-001", "faculty123", "faculty", { department_id: csId!, course_id: bcaId });
    const fac2 = await createUser("Priya Sharma", "FAC-2024-002", "faculty123", "faculty", { department_id: csId!, course_id: bcaId });
    const fac3 = await createUser("Amit Verma", "FAC-2024-003", "faculty123", "faculty", { department_id: csId!, course_id: bcaId });
    const fac4 = await createUser("Sneha Patel", "FAC-2024-004", "faculty123", "faculty", { department_id: csId!, course_id: bcaId });
    const fac5 = await createUser("Rohit Mehta", "FAC-2024-005", "faculty123", "faculty", { department_id: baId!, course_id: bbaId });

    // ========= SUBJECTS =========
    push("--- Creating Subjects ---");
    async function getOrCreateSubject(name: string, course_id: string, year: number, faculty_id: string | null) {
      const { data: existing } = await supabaseAdmin.from("subjects").select("id").eq("name", name).eq("course_id", course_id).eq("year", year).single();
      if (existing) {
        if (faculty_id) await supabaseAdmin.from("subjects").update({ faculty_id }).eq("id", existing.id);
        return existing.id;
      }
      const { data } = await supabaseAdmin.from("subjects").insert({ name, course_id, year, faculty_id }).select().single();
      return data!.id;
    }
    // BCA Year 1
    const subProgFund = await getOrCreateSubject("Programming Fundamentals", bcaId, 1, fac1);
    const subMath = await getOrCreateSubject("Mathematics", bcaId, 1, fac2);
    const subWebDev = await getOrCreateSubject("Web Development", bcaId, 1, fac1);
    const subDBMS = await getOrCreateSubject("Database Management", bcaId, 1, fac2);
    // BCA Year 2
    const subDS = await getOrCreateSubject("Data Structures", bcaId, 2, fac3);
    const subOS = await getOrCreateSubject("Operating Systems", bcaId, 2, fac3);
    const subSE = await getOrCreateSubject("Software Engineering", bcaId, 2, fac4);
    const subCN = await getOrCreateSubject("Computer Networks", bcaId, 2, fac4);
    // BBA Year 1
    const subBC = await getOrCreateSubject("Business Communication", bbaId, 1, fac5);
    const subAcc = await getOrCreateSubject("Accounting", bbaId, 1, fac5);
    const subMkt = await getOrCreateSubject("Marketing Basics", bbaId, 1, fac5);
    const subEcon = await getOrCreateSubject("Economics", bbaId, 1, fac5);
    push(`Subjects created: 12 total`);

    // ========= STUDENTS =========
    push("--- Creating Students ---");
    // BCA Y1 Section A
    const stu1 = await createUser("Aarav Singh", "STU-BCA-2024-001", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY1A, year: 1 });
    const stu2 = await createUser("Diya Joshi", "STU-BCA-2024-002", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY1A, year: 1 });
    const stu3 = await createUser("Karan Mehta", "STU-BCA-2024-003", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY1A, year: 1 });
    const stu4 = await createUser("Ananya Reddy", "STU-BCA-2024-004", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY1A, year: 1 });
    // BCA Y1 Section B
    const stu5 = await createUser("Rohan Gupta", "STU-BCA-2024-005", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY1B, year: 1 });
    const stu6 = await createUser("Ishaan Nair", "STU-BCA-2024-006", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY1B, year: 1 });
    const stu7 = await createUser("Pooja Iyer", "STU-BCA-2024-007", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY1B, year: 1 });
    // BCA Y2 Section A
    const stu8 = await createUser("Vikram Desai", "STU-BCA-2024-008", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY2A, year: 2 });
    const stu9 = await createUser("Meera Pillai", "STU-BCA-2024-009", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY2A, year: 2 });
    const stu10 = await createUser("Arjun Tiwari", "STU-BCA-2024-010", "student123", "student", { department_id: csId!, course_id: bcaId, section_id: bcaY2A, year: 2 });
    // BBA Y1 Section A
    const stu11 = await createUser("Neha Kapoor", "STU-BBA-2024-001", "student123", "student", { department_id: baId!, course_id: bbaId, section_id: bbaY1A, year: 1 });
    const stu12 = await createUser("Siddharth Rao", "STU-BBA-2024-002", "student123", "student", { department_id: baId!, course_id: bbaId, section_id: bbaY1A, year: 1 });

    const allStudentIds = [stu1, stu2, stu3, stu4, stu5, stu6, stu7, stu8, stu9, stu10, stu11, stu12].filter(Boolean) as string[];
    push(`Students created: ${allStudentIds.length}`);

    // ========= ACADEMIC RECORDS =========
    push("--- Seeding Academic Records ---");
    let totalRecords = 0;

    // Base marks for BCA Y1 subjects
    const bcaY1Marks: Record<string, { tests: [number, number, number] }> = {
      [subProgFund]: { tests: [85, 78, 88] },
      [subMath]: { tests: [72, 68, 75] },
      [subWebDev]: { tests: [90, 85, 92] },
      [subDBMS]: { tests: [80, 76, 82] },
    };
    const testNames = ["Test 1", "Test 2", "Mid Sem"];
    const bcaY1Students = [stu1, stu2, stu3, stu4, stu5, stu6, stu7].filter(Boolean) as string[];
    const bcaY1Faculty: Record<string, string> = {
      [subProgFund]: fac1!, [subMath]: fac2!, [subWebDev]: fac1!, [subDBMS]: fac2!,
    };

    for (const stuId of bcaY1Students) {
      const offset = Math.floor(Math.random() * 15) - 7; // -7 to +7
      for (const [subId, info] of Object.entries(bcaY1Marks)) {
        for (let t = 0; t < 3; t++) {
          const marks = Math.max(30, Math.min(100, info.tests[t] + offset + Math.floor(Math.random() * 6) - 3));
          await supabaseAdmin.from("academic_records").insert({
            student_id: stuId, subject_id: subId, test_name: testNames[t],
            marks_obtained: marks, max_marks: 100, recorded_by: bcaY1Faculty[subId],
          });
          totalRecords++;
        }
      }
    }

    // BCA Y2 marks
    const bcaY2Subjects = [subDS, subOS, subSE, subCN];
    const bcaY2BaseMark = [82, 75, 88, 70];
    const bcaY2Students = [stu8, stu9, stu10].filter(Boolean) as string[];
    const bcaY2Faculty: Record<string, string> = {
      [subDS]: fac3!, [subOS]: fac3!, [subSE]: fac4!, [subCN]: fac4!,
    };
    for (const stuId of bcaY2Students) {
      const offset = Math.floor(Math.random() * 15) - 7;
      for (let s = 0; s < bcaY2Subjects.length; s++) {
        for (let t = 0; t < 3; t++) {
          const marks = Math.max(30, Math.min(100, bcaY2BaseMark[s] + offset + Math.floor(Math.random() * 10) - 5));
          await supabaseAdmin.from("academic_records").insert({
            student_id: stuId, subject_id: bcaY2Subjects[s], test_name: testNames[t],
            marks_obtained: marks, max_marks: 100, recorded_by: bcaY2Faculty[bcaY2Subjects[s]],
          });
          totalRecords++;
        }
      }
    }

    // BBA Y1 marks
    const bbaSubjects = [subBC, subAcc, subMkt, subEcon];
    const bbaBaseMark = [78, 82, 85, 70];
    const bbaStudents = [stu11, stu12].filter(Boolean) as string[];
    for (const stuId of bbaStudents) {
      const offset = Math.floor(Math.random() * 15) - 7;
      for (let s = 0; s < bbaSubjects.length; s++) {
        for (let t = 0; t < 3; t++) {
          const marks = Math.max(30, Math.min(100, bbaBaseMark[s] + offset + Math.floor(Math.random() * 10) - 5));
          await supabaseAdmin.from("academic_records").insert({
            student_id: stuId, subject_id: bbaSubjects[s], test_name: testNames[t],
            marks_obtained: marks, max_marks: 100, recorded_by: fac5!,
          });
          totalRecords++;
        }
      }
    }
    push(`Academic records seeded: ${totalRecords}`);

    // ========= ATTENDANCE =========
    push("--- Seeding Attendance ---");
    let totalAttendance = 0;
    const today = new Date();
    
    // Attendance rates per student index (some low for "at risk")
    const attendanceRates = [0.92, 0.88, 0.70, 0.95, 0.82, 0.68, 0.90, 0.85, 0.73, 0.91, 0.87, 0.93];

    for (let si = 0; si < allStudentIds.length; si++) {
      const stuId = allStudentIds[si];
      const rate = attendanceRates[si];
      
      // Determine which subjects this student takes
      let studentSubjects: string[] = [];
      let facultyMap: Record<string, string> = {};
      if (si < 7) { // BCA Y1
        studentSubjects = [subProgFund, subMath, subWebDev, subDBMS];
        facultyMap = bcaY1Faculty;
      } else if (si < 10) { // BCA Y2
        studentSubjects = bcaY2Subjects;
        facultyMap = bcaY2Faculty;
      } else { // BBA Y1
        studentSubjects = bbaSubjects;
        facultyMap = { [subBC]: fac5!, [subAcc]: fac5!, [subMkt]: fac5!, [subEcon]: fac5! };
      }

      for (const subId of studentSubjects) {
        for (let d = 1; d <= 30; d++) {
          // Skip weekends roughly
          const date = new Date(today);
          date.setDate(date.getDate() - d);
          if (date.getDay() === 0 || date.getDay() === 6) continue;
          
          const isPresent = Math.random() < rate;
          const status = isPresent ? "present" : (Math.random() < 0.3 ? "late" : "absent");
          const dateStr = date.toISOString().split("T")[0];
          
          await supabaseAdmin.from("attendance").insert({
            student_id: stuId, subject_id: subId, date: dateStr,
            status, marked_by: facultyMap[subId] || fac1!,
          });
          totalAttendance++;
        }
      }
    }
    push(`Attendance records seeded: ${totalAttendance}`);

    // ========= ACHIEVEMENTS =========
    push("--- Seeding Achievements ---");
    let totalAchievements = 0;

    interface AchievementSeed {
      student_id: string;
      title: string;
      type: string;
      status: string;
      skills: string[];
      description?: string;
      organizer?: string;
      date?: string;
      reject_reason?: string;
      verifier?: string;
    }

    const achievementSeeds: AchievementSeed[] = [
      // Aarav Singh
      { student_id: stu1!, title: "Smart India Hackathon 2024", type: "Hackathon", status: "approved", skills: ["Python", "Problem Solving"], organizer: "Government of India", date: "2024-09-15", verifier: fac1! },
      { student_id: stu1!, title: "AWS Cloud Workshop", type: "Workshop", status: "approved", skills: ["Cloud Computing", "AWS"], organizer: "AWS Academy", date: "2024-10-20", verifier: fac1! },
      { student_id: stu1!, title: "AI/ML Bootcamp", type: "Workshop", status: "pending", skills: ["Machine Learning", "AI"], organizer: "Google", date: "2025-01-10" },
      // Diya Joshi
      { student_id: stu2!, title: "Web Dev Internship at TechCorp", type: "Internship", status: "approved", skills: ["React", "Node.js", "HTML/CSS"], organizer: "TechCorp", date: "2024-06-01", verifier: fac1! },
      { student_id: stu2!, title: "State Level Badminton", type: "Sports", status: "approved", skills: ["Teamwork", "Leadership"], organizer: "State Sports Authority", date: "2024-11-05", verifier: fac1! },
      { student_id: stu2!, title: "Figma UI Design Workshop", type: "Workshop", status: "pending", skills: ["UI Design", "Figma"], organizer: "Design Academy", date: "2025-02-14" },
      // Karan Mehta
      { student_id: stu3!, title: "CodeFest 2024", type: "Hackathon", status: "approved", skills: ["JavaScript", "API Integration"], organizer: "TechSoc", date: "2024-08-22", verifier: fac2! },
      { student_id: stu3!, title: "Database Management Seminar", type: "Workshop", status: "rejected", skills: ["SQL"], organizer: "Oracle Academy", date: "2024-07-10", reject_reason: "Certificate unclear", verifier: fac2! },
      // Ananya Reddy
      { student_id: stu4!, title: "Google Developer Student Club Lead", type: "Other", status: "approved", skills: ["Leadership", "Public Speaking"], organizer: "Google", date: "2024-05-01", verifier: fac1! },
      { student_id: stu4!, title: "National Science Olympiad", type: "Other", status: "approved", skills: ["Critical Thinking"], organizer: "Science Foundation", date: "2024-12-01", verifier: fac2! },
      // Rohan Gupta
      { student_id: stu5!, title: "Flutter App Development Internship", type: "Internship", status: "approved", skills: ["Flutter", "Dart", "Mobile Dev"], organizer: "AppStudio", date: "2024-07-15", verifier: fac1! },
      { student_id: stu5!, title: "Zonal Cricket Tournament", type: "Sports", status: "approved", skills: ["Teamwork"], organizer: "University Sports", date: "2024-09-28", verifier: fac1! },
      // Vikram Desai
      { student_id: stu8!, title: "Full Stack Web Dev Internship", type: "Internship", status: "approved", skills: ["React", "Node.js", "MongoDB"], organizer: "DevHouse", date: "2024-06-20", verifier: fac3! },
      { student_id: stu8!, title: "HackMIT 2024", type: "Hackathon", status: "pending", skills: ["Python", "AI"], organizer: "MIT", date: "2025-01-25" },
      // Neha Kapoor
      { student_id: stu11!, title: "Business Plan Competition Winner", type: "Other", status: "approved", skills: ["Business Strategy", "Presentation"], organizer: "Startup India", date: "2024-10-05", verifier: fac5! },
      { student_id: stu11!, title: "Marketing Internship", type: "Internship", status: "approved", skills: ["Digital Marketing", "SEO"], organizer: "MarketPro", date: "2024-08-10", verifier: fac5! },
    ];

    for (const a of achievementSeeds) {
      if (!a.student_id) continue;
      const { data: achData } = await supabaseAdmin.from("achievements").insert({
        student_id: a.student_id,
        title: a.title,
        type: a.type,
        status: a.status,
        skills: a.skills,
        description: a.description || `${a.title} - ${a.type} achievement`,
        organizer: a.organizer,
        date: a.date,
      }).select().single();
      totalAchievements++;

      if (achData && a.status !== "pending" && a.verifier) {
        const vDate = new Date();
        vDate.setDate(vDate.getDate() - Math.floor(Math.random() * 60));
        await supabaseAdmin.from("verifications").insert({
          achievement_id: achData.id,
          faculty_id: a.verifier,
          status: a.status,
          remarks: a.status === "rejected" ? a.reject_reason : "Certificate verified and approved",
          verified_at: vDate.toISOString(),
        });
      }
    }
    push(`Achievements seeded: ${totalAchievements}`);

    // ========= NOTIFICATIONS =========
    push("--- Seeding Notifications ---");
    let totalNotifs = 0;
    const notifData: { user_id: string; message: string }[] = [];

    if (stu1) {
      notifData.push({ user_id: stu1, message: "Your achievement 'Smart India Hackathon 2024' has been approved! ✓" });
      notifData.push({ user_id: stu1, message: "Your achievement 'AWS Cloud Workshop' has been approved! ✓" });
      notifData.push({ user_id: stu1, message: "New marks added for Programming Fundamentals - Test 1" });
      notifData.push({ user_id: stu1, message: "Attendance marked for Web Development" });
    }
    if (stu2) {
      notifData.push({ user_id: stu2, message: "Your achievement 'Web Dev Internship at TechCorp' has been approved! ✓" });
      notifData.push({ user_id: stu2, message: "Your achievement 'State Level Badminton' has been approved! ✓" });
      notifData.push({ user_id: stu2, message: "New marks added for Mathematics - Mid Sem" });
    }
    if (stu3) {
      notifData.push({ user_id: stu3, message: "Your achievement 'CodeFest 2024' has been approved! ✓" });
      notifData.push({ user_id: stu3, message: "Your achievement 'Database Management Seminar' was rejected. Reason: Certificate unclear" });
      notifData.push({ user_id: stu3, message: "Attendance marked for Database Management" });
    }
    if (stu4) {
      notifData.push({ user_id: stu4, message: "Your achievement 'Google Developer Student Club Lead' has been approved! ✓" });
      notifData.push({ user_id: stu4, message: "New marks added for Web Development - Test 2" });
    }
    if (stu5) {
      notifData.push({ user_id: stu5, message: "Your achievement 'Flutter App Development Internship' has been approved! ✓" });
      notifData.push({ user_id: stu5, message: "New marks added for Programming Fundamentals - Mid Sem" });
    }
    if (stu8) {
      notifData.push({ user_id: stu8, message: "Your achievement 'Full Stack Web Dev Internship' has been approved! ✓" });
      notifData.push({ user_id: stu8, message: "New marks added for Data Structures - Test 1" });
    }
    if (stu11) {
      notifData.push({ user_id: stu11, message: "Your achievement 'Business Plan Competition Winner' has been approved! ✓" });
      notifData.push({ user_id: stu11, message: "Your achievement 'Marketing Internship' has been approved! ✓" });
      notifData.push({ user_id: stu11, message: "New marks added for Accounting - Test 1" });
    }
    // Faculty notifications
    if (fac1) {
      notifData.push({ user_id: fac1, message: "New achievement submission: 'AI/ML Bootcamp' by Aarav Singh pending review" });
      notifData.push({ user_id: fac1, message: "New achievement submission: 'Figma UI Design Workshop' by Diya Joshi pending review" });
      notifData.push({ user_id: fac1, message: "3 new students added to your section" });
    }
    if (fac3) {
      notifData.push({ user_id: fac3, message: "New achievement submission: 'HackMIT 2024' by Vikram Desai pending review" });
    }
    if (fac5) {
      notifData.push({ user_id: fac5, message: "2 new students added to BBA Year 1 Section A" });
    }

    for (const n of notifData) {
      if (!n.user_id) continue;
      await supabaseAdmin.from("notifications").insert(n);
      totalNotifs++;
    }
    push(`Notifications seeded: ${totalNotifs}`);

    // ========= SUMMARY =========
    const summary = {
      users: { faculty: 5, students: 12, total: 17 },
      departments: 2,
      courses: 2,
      sections: 4,
      subjects: 12,
      academic_records: totalRecords,
      attendance_records: totalAttendance,
      achievements: totalAchievements,
      notifications: totalNotifs,
    };
    push(`\n=== SEED COMPLETE ===`);
    push(JSON.stringify(summary, null, 2));

    return new Response(
      JSON.stringify({ success: true, summary, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Seed error:", err);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
