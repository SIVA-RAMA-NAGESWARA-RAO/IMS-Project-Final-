import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

// In-memory session store
let _accessToken: string | null = null;
export const setAuthToken = (token: string | null) => { _accessToken = token; };
export const clearAuthToken = () => { _accessToken = null; };
export const getAuthToken = () => _accessToken;

// LocalStorage helpers for standalone Mock Database
const getStore = (key: string, defaultVal: any) => {
  if (typeof window === "undefined") return defaultVal;
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : defaultVal;
};

const setStore = (key: string, val: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

// Initialize Mock Databases with realistic seed data
const initDB = () => {
  if (typeof window === "undefined") return;

  const defaultUsers = [
    { _id: "u1", name: "Siva Ram", email: "hr@ims.ai", role: "hr", isVerified: true, isActive: true },
    { _id: "u2", name: "System Admin", email: "admin@ims.ai", role: "admin", isVerified: true, isActive: true },
    { _id: "u3", name: "Interviewer John", email: "interviewer@ims.ai", role: "interviewer", isVerified: true, isActive: true },
    { _id: "u4", name: "Candidate Siva", email: "candidate@ims.ai", role: "candidate", isVerified: true, isActive: true }
  ];

  const defaultJobs = [
    { _id: "j1", title: "Senior Frontend Developer (Next.js)", department: "Engineering", location: "Remote", type: "Full-time", status: "Open", description: "Looking for a Next.js developer with deep knowledge of React Server Components." },
    { _id: "j2", title: "Lead AI Engineer (Gemini/LLMs)", department: "AI Research", location: "Hybrid", type: "Full-time", status: "Open", description: "Lead LLM application design and AI agent engineering." },
    { _id: "j3", title: "HR Generalist", department: "People Ops", location: "On-site", type: "Full-time", status: "Open", description: "Manage hiring workflows and interview coordination." }
  ];

  const defaultApplications = [
    { 
      _id: "a1", 
      user: { name: "Candidate Siva", email: "candidate@ims.ai" },
      job: { _id: "j1", title: "Senior Frontend Developer (Next.js)" }, 
      candidateName: "Candidate Siva", 
      email: "candidate@ims.ai", 
      status: "Shortlisted", 
      appliedDate: "2026-06-25T10:00:00Z",
      resumeUrl: "/resumes/siva_cv.pdf",
      phone: "+91 98765 43210"
    }
  ];

  const defaultAvailability = [
    { _id: "av1", date: "2026-06-29", startTime: "09:00", endTime: "10:00", status: "available" },
    { _id: "av2", date: "2026-06-29", startTime: "11:00", endTime: "12:00", status: "available" },
    { _id: "av3", date: "2026-06-30", startTime: "14:00", endTime: "15:00", status: "available" }
  ];

  const defaultInterviews = [
    { 
      _id: "i1", 
      jobTitle: "Senior Frontend Developer (Next.js)", 
      candidate: { name: "Candidate Siva", email: "candidate@ims.ai" }, 
      date: "2026-06-29T09:00:00Z", 
      status: "Scheduled", 
      mode: "zoom", 
      meetingLink: "https://meet.jit.si/ims-interview-sivafrotend" 
    }
  ];

  const defaultAuditLogs = [
    { _id: "ad1", action: "job_created", entityType: "Job", details: "Senior Frontend Developer (Next.js)", createdAt: "2026-06-25T09:00:00.000Z" },
    { _id: "ad2", action: "application_submitted", entityType: "Application", details: "Candidate Siva - Next.js Developer", createdAt: "2026-06-25T10:00:00.000Z" },
    { _id: "ad3", action: "interview_scheduled", entityType: "Interview", details: "Candidate Siva on 2026-06-29", createdAt: "2026-06-26T11:00:00.000Z" }
  ];

  const defaultTemplates = [
    { _id: "t1", title: "Frontend Technical Interview Template", type: "Technical", questions: ["Explain Next.js Server Components", "Write a debounce function"], job: { _id: "j1", title: "Senior Frontend Developer (Next.js)" } }
  ];

  const defaultScorecards = [
    { _id: "s1", candidateName: "Candidate Siva", jobTitle: "Senior Frontend Developer (Next.js)", overallScore: 4.5, recommendation: "Strong Hire", feedback: "Excellent React & Next.js skills.", criteriaScores: { technical: 5, communication: 4 } }
  ];

  if (!localStorage.getItem("ims_db_users")) setStore("ims_db_users", defaultUsers);
  if (!localStorage.getItem("ims_db_jobs")) setStore("ims_db_jobs", defaultJobs);
  if (!localStorage.getItem("ims_db_applications")) setStore("ims_db_applications", defaultApplications);
  if (!localStorage.getItem("ims_db_availability")) setStore("ims_db_availability", defaultAvailability);
  if (!localStorage.getItem("ims_db_interviews")) setStore("ims_db_interviews", defaultInterviews);
  if (!localStorage.getItem("ims_db_audit_logs")) setStore("ims_db_audit_logs", defaultAuditLogs);
  if (!localStorage.getItem("ims_db_templates")) setStore("ims_db_templates", defaultTemplates);
  if (!localStorage.getItem("ims_db_scorecards")) setStore("ims_db_scorecards", defaultScorecards);
};

initDB();

// Axios Custom Adapter for standalone Next.js simulation
const mockAdapter = async (config: AxiosRequestConfig): Promise<any> => {
  const fullUrl = config.url || "";
  // Strip host/base path
  const path = fullUrl.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");
  const method = (config.method || "get").toLowerCase();
  const data = typeof config.data === "string" ? JSON.parse(config.data) : config.data;

  // Database Accessors
  const users = () => getStore("ims_db_users", []);
  const jobs = () => getStore("ims_db_jobs", []);
  const applications = () => getStore("ims_db_applications", []);
  const availability = () => getStore("ims_db_availability", []);
  const interviews = () => getStore("ims_db_interviews", []);
  const auditLogs = () => getStore("ims_db_audit_logs", []);
  const templates = () => getStore("ims_db_templates", []);
  const scorecards = () => getStore("ims_db_scorecards", []);

  const saveUsers = (val: any) => setStore("ims_db_users", val);
  const saveJobs = (val: any) => setStore("ims_db_jobs", val);
  const saveApplications = (val: any) => setStore("ims_db_applications", val);
  const saveAvailability = (val: any) => setStore("ims_db_availability", val);
  const saveInterviews = (val: any) => setStore("ims_db_interviews", val);
  const saveAuditLogs = (val: any) => setStore("ims_db_audit_logs", val);
  const saveTemplates = (val: any) => setStore("ims_db_templates", val);
  const saveScorecards = (val: any) => setStore("ims_db_scorecards", val);

  const addAuditLog = (action: string, entityType: string, details: string) => {
    const logs = auditLogs();
    logs.unshift({
      _id: "ad_" + Date.now(),
      action,
      entityType,
      details,
      createdAt: new Date().toISOString()
    });
    saveAuditLogs(logs);
  };

  // Helper mock delay to simulate server communication
  await new Promise((r) => setTimeout(r, 400));

  // --- Auth Handlers ---
  if (path.startsWith("/auth/login")) {
    const { email } = data;
    // Temp token stores the requested login email
    const tempToken = btoa(JSON.stringify({ email }));
    return {
      data: {
        requiresOtp: true,
        tempToken,
        resendCooldownSeconds: 60,
        message: "A sign-in code has been sent to your email."
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    };
  }

  if (path.startsWith("/auth/verify-login-otp")) {
    const { tempToken, code } = data;
    let email = "candidate@ims.ai";
    try {
      const decoded = JSON.parse(atob(tempToken));
      email = decoded.email;
    } catch {}

    // Find or bootstrap user
    let user = users().find((u: any) => u.email === email);
    if (!user) {
      // Determine role from email prefix
      let role = "candidate";
      let name = "Candidate";
      if (email.startsWith("admin")) { role = "admin"; name = "System Admin"; }
      else if (email.startsWith("hr")) { role = "hr"; name = "Siva Ram"; }
      else if (email.startsWith("interviewer")) { role = "interviewer"; name = "Interviewer John"; }

      user = { _id: "u_" + Date.now(), name, email, role, isVerified: true, isActive: true };
      const uList = users();
      uList.push(user);
      saveUsers(uList);
    }

    const token = btoa(JSON.stringify({ id: user._id, role: user.role }));
    addAuditLog("login_success", "User", user.email);

    return {
      data: { user, accessToken: token },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    };
  }

  if (path.startsWith("/auth/register")) {
    const { name, email, password, phone } = data;
    const exists = users().find((u: any) => u.email === email);
    if (exists) {
      throw { response: { data: { message: "Account already exists" }, status: 409 } };
    }
    const newUser = { _id: "u_" + Date.now(), name, email, role: "candidate", isVerified: false, isActive: true, phone };
    const uList = users();
    uList.push(newUser);
    saveUsers(uList);

    return {
      data: { message: "Registration successful. Please verify OTP.", email },
      status: 201,
      statusText: "Created",
      headers: {},
      config
    };
  }

  if (path.startsWith("/auth/verify-otp")) {
    const { email } = data;
    const uList = users();
    const user = uList.find((u: any) => u.email === email);
    if (user) {
      user.isVerified = true;
      saveUsers(uList);
    }
    const token = btoa(JSON.stringify({ id: user?._id, role: user?.role }));
    return {
      data: { user, accessToken: token },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    };
  }

  if (path.startsWith("/auth/refresh")) {
    // Read from client-side stored session
    let localUser = null;
    let localToken = null;
    if (typeof window !== "undefined") {
      localUser = localStorage.getItem("ims_user");
      localToken = localStorage.getItem("ims_token");
    }
    if (localUser && localToken) {
      return {
        data: { user: JSON.parse(localUser), accessToken: localToken },
        status: 200,
        statusText: "OK",
        headers: {},
        config
      };
    }
    throw { response: { data: { message: "Unauthorized" }, status: 401 } };
  }

  if (path.startsWith("/auth/logout")) {
    return { data: { message: "Logged out" }, status: 200, statusText: "OK", headers: {}, config };
  }

  // --- Availability Handlers ---
  if (path.startsWith("/availability")) {
    if (method === "get") {
      return { data: availability(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (method === "post") {
      const slots = availability();
      const newSlot = { _id: "av_" + Date.now(), ...data, status: "available" };
      slots.push(newSlot);
      saveAvailability(slots);
      return { data: newSlot, status: 201, statusText: "Created", headers: {}, config };
    }
    if (method === "delete") {
      const slots = availability();
      const id = path.split("/").pop();
      const filtered = slots.filter((s: any) => s._id !== id);
      saveAvailability(filtered);
      return { data: { message: "Deleted" }, status: 200, statusText: "OK", headers: {}, config };
    }
  }

  // --- Jobs Handlers ---
  if (path.startsWith("/jobs")) {
    if (method === "get") {
      return { data: jobs(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (method === "post") {
      const jobList = jobs();
      const newJob = { _id: "j_" + Date.now(), ...data, status: "Open" };
      jobList.push(newJob);
      saveJobs(jobList);
      addAuditLog("job_created", "Job", newJob.title);
      return { data: newJob, status: 201, statusText: "Created", headers: {}, config };
    }
  }

  // --- Applications Handlers ---
  if (path.startsWith("/applications/mine")) {
    const list = applications();
    return { data: { applications: list }, status: 200, statusText: "OK", headers: {}, config };
  }

  if (path.startsWith("/applications/upload-resume")) {
    return { data: { resumeUrl: "/resumes/mock_upload.pdf" }, status: 200, statusText: "OK", headers: {}, config };
  }

  if (path.startsWith("/applications/apply")) {
    const list = applications();
    const newApp = {
      _id: "a_" + Date.now(),
      ...data,
      status: "Applied",
      appliedDate: new Date().toISOString()
    };
    list.push(newApp);
    saveApplications(list);
    addAuditLog("application_submitted", "Application", `${newApp.candidateName} - ${newApp.email}`);
    return { data: newApp, status: 201, statusText: "Created", headers: {}, config };
  }

  if (path.startsWith("/applications")) {
    return { data: applications(), status: 200, statusText: "OK", headers: {}, config };
  }

  // --- Interviews Handlers ---
  if (path.startsWith("/interviews")) {
    if (method === "get") {
      return { data: interviews(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (method === "post") {
      const list = interviews();
      const newInt = { _id: "i_" + Date.now(), ...data, status: "Scheduled" };
      list.push(newInt);
      saveInterviews(list);
      addAuditLog("interview_scheduled", "Interview", `${newInt.candidate.name} - ${newInt.jobTitle}`);
      return { data: newInt, status: 201, statusText: "Created", headers: {}, config };
    }
  }

  if (path.startsWith("/interviewers")) {
    const list = users().filter((u: any) => u.role === "interviewer" || u.role === "hr");
    return { data: list, status: 200, statusText: "OK", headers: {}, config };
  }

  // --- Dashboard KPI Handlers ---
  if (path.startsWith("/dashboard/kpi")) {
    const activeJobs = jobs().filter((j: any) => j.status === "Open").length;
    const totalApps = applications().length;
    const totalInterviews = interviews().length;
    return {
      data: {
        totalCandidates: totalApps * 3 + 4,
        openPositions: activeJobs,
        interviewsThisWeek: totalInterviews,
        timeToHire: "14 days"
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    };
  }

  if (path.startsWith("/dashboard/time-to-hire")) {
    return { data: { timeToHire: "14 days" }, status: 200, statusText: "OK", headers: {}, config };
  }

  // --- Audit Log Handler ---
  if (path.startsWith("/audit")) {
    return { data: auditLogs(), status: 200, statusText: "OK", headers: {}, config };
  }

  // --- Templates Handlers ---
  if (path.startsWith("/templates")) {
    if (method === "get") {
      return { data: templates(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (method === "post") {
      const list = templates();
      const newTemp = { _id: "t_" + Date.now(), ...data };
      list.push(newTemp);
      saveTemplates(list);
      return { data: newTemp, status: 201, statusText: "Created", headers: {}, config };
    }
    if (method === "delete") {
      const list = templates();
      const id = path.split("/").pop();
      const filtered = list.filter((t: any) => t._id !== id);
      saveTemplates(filtered);
      return { data: { message: "Deleted" }, status: 200, statusText: "OK", headers: {}, config };
    }
  }

  // --- Scorecards Handlers ---
  if (path.startsWith("/scorecards")) {
    if (method === "get") {
      return { data: scorecards(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (method === "post") {
      const list = scorecards();
      const newScore = { _id: "s_" + Date.now(), ...data };
      list.push(newScore);
      saveScorecards(list);
      addAuditLog("scorecard_submitted", "Scorecard", `${newScore.candidateName} - ${newScore.recommendation}`);
      return { data: newScore, status: 201, statusText: "Created", headers: {}, config };
    }
  }

  // --- Settings Users Handlers ---
  if (path.startsWith("/admin/users")) {
    if (method === "get") {
      return { data: users(), status: 200, statusText: "OK", headers: {}, config };
    }
    if (method === "post") {
      const list = users();
      const newUser = { _id: "u_" + Date.now(), ...data, isVerified: true, isActive: true };
      list.push(newUser);
      saveUsers(list);
      return { data: newUser, status: 201, statusText: "Created", headers: {}, config };
    }
  }

  // --- AI Agent Handlers ---
  if (path.startsWith("/agent/propose")) {
    const { message } = data;
    const msgLower = message.toLowerCase();

    let proposal = {
      action: "HELP_EXPLANATION",
      parameters: {},
      explanation: "I can assist you with managing hiring, creating jobs, checking candidate statuses, scheduling, or drafting scorecards."
    };

    if (msgLower.includes("status") || msgLower.includes("candidate") || msgLower.includes("check")) {
      // Find candidate name in message
      let name = "Siva";
      if (msgLower.includes("john")) name = "John";
      proposal = {
        action: "CHECK_STATUS",
        parameters: { candidateName: name },
        explanation: `I will check the current recruitment status of candidate ${name} inside the database.`
      };
    }

    return {
      data: { proposal },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    };
  }

  if (path.startsWith("/agent/execute")) {
    const { action, parameters } = data;
    let result = "Execution complete.";

    if (action === "CHECK_STATUS") {
      const candidateName = parameters.candidateName || "Siva";
      const app = applications().find((a: any) => a.candidateName.toLowerCase().includes(candidateName.toLowerCase()));
      if (app) {
        result = `Success: Candidate ${app.candidateName}'s application for '${app.job.title}' is currently in '${app.status}' status.`;
      } else {
        result = `Note: No application found matching candidate '${candidateName}'.`;
      }
    }

    return {
      data: { result },
      status: 200,
      statusText: "OK",
      headers: {},
      config
    };
  }

  throw { response: { data: { message: "Mock endpoint not implemented" }, status: 404 } };
};

// Create client instance using the mock adapter
const apiClient = axios.create({
  baseURL: "http://localhost:5000/api", // dummy base URL
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
  adapter: mockAdapter // Use custom mock adapter
});

export default apiClient;
