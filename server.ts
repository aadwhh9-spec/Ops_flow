import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Mock Database State
interface Project {
  id: string;
  name: string;
  description: string;
  status: "In Progress" | "Review" | "Planning" | "Completed";
  startDate: string;
  endDate: string;
  progress: number;
  color: string;
  team: string[];
}

interface Task {
  id: string;
  projectId: string;
  name: string;
  assignedTo: string;
  priority: "High" | "Medium" | "Low";
  status: "Completed" | "In Progress" | "Not Started";
  date: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Away";
  since: string;
}

interface ChatMessage {
  id: string;
  type: "proj" | "dm";
  targetId: string; // projectId or memberId
  sender: {
    name: string;
    initials: string;
    color: string;
  };
  text: string;
  timestamp: string;
}

// Seed Initial Data matching the HTML templates
let projects: Project[] = [
  {
    id: "ecommerce",
    name: "E-Commerce Redesign",
    description: "Full redesign of the platform for faster checkouts and modern catalog display.",
    status: "In Progress",
    startDate: "Jun 1",
    endDate: "Aug 15",
    progress: 68,
    color: "#3B82F6", // Blue
    team: ["Sara Ahmed", "Lina Nasser", "Omar Khalid"],
  },
  {
    id: "healthcare",
    name: "Healthcare Portal",
    description: "Patient and clinician secure management system with interactive calendar appointment scheduling.",
    status: "In Progress",
    startDate: "May 15",
    endDate: "Sep 30",
    progress: 42,
    color: "#22C55E", // Green
    team: ["Lina Nasser", "Faisal Al-Amin", "Hana Malik"],
  },
  {
    id: "banking",
    name: "Mobile Banking App",
    description: "Consumer mobile banking native application supporting quick funds transfer and multi-currency accounts.",
    status: "Review",
    startDate: "Apr 1",
    endDate: "Jul 31",
    progress: 81,
    color: "#8B5CF6", // Purple
    team: ["Omar Khalid", "Tariq Saud", "Sara Ahmed"],
  },
  {
    id: "supply",
    name: "Supply Chain System",
    description: "Internal supply chain, cargo tracking, and warehouse automated inventory optimization.",
    status: "Planning",
    startDate: "Jul 1",
    endDate: "Nov 30",
    progress: 23,
    color: "#F59E0B", // Orange
    team: ["Tariq Saud", "Faisal Al-Amin"],
  },
  {
    id: "hr",
    name: "HR Platform",
    description: "Human resources, performance evaluation, automated payroll, and leave management.",
    status: "In Progress",
    startDate: "Jun 15",
    endDate: "Oct 1",
    progress: 55,
    color: "#EF4444", // Red
    team: ["Hana Malik", "Sara Ahmed", "Lina Nasser"],
  },
];

let tasks: Task[] = [
  {
    id: "t1",
    projectId: "ecommerce",
    name: "Homepage wireframes",
    assignedTo: "Sara Ahmed",
    priority: "High",
    status: "Completed",
    date: "2026-07-02",
  },
  {
    id: "t2",
    projectId: "healthcare",
    name: "Patient dashboard mockup",
    assignedTo: "Lina Nasser",
    priority: "Medium",
    status: "Completed",
    date: "2026-07-05",
  },
  {
    id: "t3",
    projectId: "hr",
    name: "User research report",
    assignedTo: "Hana Malik",
    priority: "Low",
    status: "Completed",
    date: "2026-07-08",
  },
  {
    id: "t4",
    projectId: "banking",
    name: "Auth flow implementation",
    assignedTo: "Omar Khalid",
    priority: "High",
    status: "Completed",
    date: "2026-07-10",
  },
  {
    id: "t5",
    projectId: "ecommerce",
    name: "Product listing page",
    assignedTo: "Sara Ahmed",
    priority: "High",
    status: "In Progress",
    date: "2026-07-12",
  },
  {
    id: "t6",
    projectId: "supply",
    name: "Inventory tracking module",
    assignedTo: "Tariq Saud",
    priority: "Medium",
    status: "In Progress",
    date: "2026-07-14",
  },
  {
    id: "t7",
    projectId: "healthcare",
    name: "Appointment booking system",
    assignedTo: "Faisal Al-Amin",
    priority: "High",
    status: "In Progress",
    date: "2026-07-15",
  },
  {
    id: "t8",
    projectId: "banking",
    name: "Transaction history view",
    assignedTo: "Omar Khalid",
    priority: "Medium",
    status: "In Progress",
    date: "2026-07-16",
  },
  {
    id: "t9",
    projectId: "hr",
    name: "Performance review module",
    assignedTo: "Hana Malik",
    priority: "Medium",
    status: "Not Started",
    date: "2026-07-18",
  },
  {
    id: "t10",
    projectId: "supply",
    name: "Analytics dashboard",
    assignedTo: "Tariq Saud",
    priority: "Low",
    status: "Not Started",
    date: "2026-07-20",
  },
  {
    id: "t11",
    projectId: "ecommerce",
    name: "Checkout flow redesign",
    assignedTo: "Sara Ahmed",
    priority: "High",
    status: "Not Started",
    date: "2026-07-22",
  },
  {
    id: "t12",
    projectId: "healthcare",
    name: "Medical records API integration",
    assignedTo: "Lina Nasser",
    priority: "Medium",
    status: "Not Started",
    date: "2026-07-24",
  },
];

let members: Member[] = [
  {
    id: "sara",
    name: "Sara Ahmed",
    email: "sara.a@opsflow.io",
    role: "Product Designer",
    department: "Design",
    status: "Active",
    since: "Feb 2024",
  },
  {
    id: "omar",
    name: "Omar Khalid",
    email: "omar.k@opsflow.io",
    role: "Backend Engineer",
    department: "Engineering",
    status: "Active",
    since: "Jan 2024",
  },
  {
    id: "lina",
    name: "Lina Nasser",
    email: "lina.n@opsflow.io",
    role: "Frontend Engineer",
    department: "Engineering",
    status: "Active",
    since: "Mar 2023",
  },
  {
    id: "faisal",
    name: "Faisal Al-Amin",
    email: "faisal.a@opsflow.io",
    role: "QA Engineer",
    department: "QA",
    status: "Away",
    since: "May 2024",
  },
  {
    id: "hana",
    name: "Hana Malik",
    email: "hana.m@opsflow.io",
    role: "Project Manager",
    department: "Operations",
    status: "Active",
    since: "Apr 2024",
  },
  {
    id: "tariq",
    name: "Tariq Saud",
    email: "tariq.s@opsflow.io",
    role: "DevOps Engineer",
    department: "Engineering",
    status: "Active",
    since: "Jun 2024",
  },
];

let chats: ChatMessage[] = [
  // E-Commerce project messages
  {
    id: "c1",
    type: "proj",
    targetId: "ecommerce",
    sender: { name: "Sara Ahmed", initials: "SA", color: "#3B82F6" },
    text: "Just pushed the updated homepage wireframes to Figma.",
    timestamp: "9:10 AM",
  },
  {
    id: "c2",
    type: "proj",
    targetId: "ecommerce",
    sender: { name: "Omar Khalid", initials: "OK", color: "#8B5CF6" },
    text: "Looks great! I will sync the backend fields to match.",
    timestamp: "9:14 AM",
  },
  {
    id: "c3",
    type: "proj",
    targetId: "ecommerce",
    sender: { name: "Ahmed Hassan", initials: "AH", color: "#0E1526" },
    text: "Perfect. Let me know once that is ready and I will QA it.",
    timestamp: "9:16 AM",
  },
  {
    id: "c4",
    type: "proj",
    targetId: "ecommerce",
    sender: { name: "Lina Nasser", initials: "LN", color: "#22C55E" },
    text: "I can start the component build today if the tokens are final.",
    timestamp: "9:20 AM",
  },
  {
    id: "c5",
    type: "proj",
    targetId: "ecommerce",
    sender: { name: "Ahmed Hassan", initials: "AH", color: "#0E1526" },
    text: "Tokens are locked — go ahead.",
    timestamp: "9:21 AM",
  },
  // Sara direct message
  {
    id: "dm1",
    type: "dm",
    targetId: "sara",
    sender: { name: "Sara Ahmed", initials: "SA", color: "#3B82F6" },
    text: "Can you review my PR when you get a chance?",
    timestamp: "2:10 PM",
  },
  {
    id: "dm2",
    type: "dm",
    targetId: "sara",
    sender: { name: "Ahmed Hassan", initials: "AH", color: "#0E1526" },
    text: "Sure, let me check the checkout code changes.",
    timestamp: "2:15 PM",
  },
  {
    id: "dm3",
    type: "dm",
    targetId: "sara",
    sender: { name: "Sara Ahmed", initials: "SA", color: "#3B82F6" },
    text: "Great, thanks! I updated the validation rules as we discussed.",
    timestamp: "2:17 PM",
  },
];

// Helper to recalculate projects' progress automatically from tasks
function syncProjectProgress() {
  projects = projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    if (projectTasks.length === 0) return { ...p, progress: 0 };
    const completedCount = projectTasks.filter((t) => t.status === "Completed").length;
    const calculatedProgress = Math.round((completedCount / projectTasks.length) * 100);
    return { ...p, progress: calculatedProgress };
  });
}

// Trigger initial sync
syncProjectProgress();

// --- REST API ENDPOINTS ---

// Fetch full workspace state
app.get("/api/workspace", (req, res) => {
  syncProjectProgress();
  res.json({
    projects,
    tasks,
    members,
    chats,
  });
});

// Create a new project
app.post("/api/projects", (req, res) => {
  const { name, description, startDate, endDate, color, team } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Project name is required" });
  }
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const newProject: Project = {
    id,
    name,
    description: description || "",
    status: "Planning",
    startDate: startDate || "TBD",
    endDate: endDate || "TBD",
    progress: 0,
    color: color || "#3B82F6",
    team: team || [],
  };
  projects.push(newProject);
  res.json({ success: true, project: newProject });
});

// Create a new task or update state
app.post("/api/tasks", (req, res) => {
  const { projectId, name, assignedTo, priority } = req.body;
  if (!projectId || !name) {
    return res.status(400).json({ error: "Project ID and task name are required" });
  }
  const newTask: Task = {
    id: `t${Date.now()}`,
    projectId,
    name,
    assignedTo: assignedTo || "Unassigned",
    priority: priority || "Medium",
    status: "Not Started",
    date: new Date().toISOString().split("T")[0],
  };
  tasks.push(newTask);
  syncProjectProgress();
  res.json({ success: true, task: newTask });
});

// Update task status (toggle complete / in-progress / not started)
app.patch("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const taskIndex = tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found" });
  }
  tasks[taskIndex].status = status;
  syncProjectProgress();
  res.json({ success: true, task: tasks[taskIndex] });
});

// Invite / add a team member
app.post("/api/members", (req, res) => {
  const { name, email, role, department, projectId } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const newMember: Member = {
    id,
    name,
    email,
    role: role || "Contributor",
    department: department || "General",
    status: "Active",
    since: new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
  };
  members.push(newMember);

  if (projectId) {
    const proj = projects.find((p) => p.id === projectId);
    if (proj && !proj.team.includes(name)) {
      proj.team.push(name);
    }
  }
  res.json({ success: true, member: newMember });
});

// Add a team member to a project team list directly
app.post("/api/projects/:id/team", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const proj = projects.find((p) => p.id === id);
  if (!proj) {
    return res.status(404).json({ error: "Project not found" });
  }
  if (!proj.team.includes(name)) {
    proj.team.push(name);
  }
  res.json({ success: true, project: proj });
});

// Send chat message
app.post("/api/chat/message", (req, res) => {
  const { type, targetId, senderName, text } = req.body;
  if (!targetId || !text || !senderName) {
    return res.status(400).json({ error: "Target, sender, and text are required" });
  }

  // Get sender initials and color
  let initials = "??";
  let color = "#1A2233";
  if (senderName === "Ahmed Hassan") {
    initials = "AH";
    color = "#0E1526";
  } else {
    const match = members.find((m) => m.name === senderName);
    if (match) {
      initials = match.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
      if (match.id === "sara") color = "#3B82F6";
      else if (match.id === "lina") color = "#22C55E";
      else if (match.id === "omar") color = "#8B5CF6";
      else if (match.id === "faisal") color = "#F59E0B";
      else if (match.id === "hana") color = "#EF4444";
      else if (match.id === "tariq") color = "#06B6D4";
    }
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const newMessage: ChatMessage = {
    id: `msg${Date.now()}`,
    type: type || "proj",
    targetId,
    sender: { name: senderName, initials, color },
    text,
    timestamp: formatter.format(new Date()),
  };
  chats.push(newMessage);
  res.json({ success: true, message: newMessage });
});

// Gemini AI Assistant Agent Integration
app.post("/api/ai/ask", async (req, res) => {
  const { question, userContext } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Compile accurate live database status context for Gemini
    syncProjectProgress();
    const systemInstruction = `You are OpsFlow Assistant, an intelligent, objective, and friendly operations agent. 
You assist users in managing projects, tasks, and teams.
The current language of the UI might be English or Arabic (EN/AR). Respond in the language that matches the user's question.

Here is the LIVE data of the OpsFlow Workspace:

PROJECTS:
${JSON.stringify(projects, null, 2)}

TASKS:
${JSON.stringify(tasks, null, 2)}

TEAM MEMBERS:
${JSON.stringify(members, null, 2)}

CHATS:
${JSON.stringify(chats, null, 2)}

Provide concise, highly accurate, and helpful operations-driven responses. If they ask about a project's timeline, progress, or team allocation, look up the live data above to answer perfectly.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: question,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const answer = response.text || "I was unable to formulate a response at this moment. Please try again.";
    res.json({ answer });
  } catch (err: any) {
    console.error("Gemini API Error in /api/ai/ask:", err);
    res.status(500).json({ error: "Failed to communicate with AI model. Please verify your GEMINI_API_KEY." });
  }
});

// --- VITE MIDDLEWARE / STATIC SERVING CONFIG ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OpsFlow Server running on http://localhost:${PORT}`);
  });
}

startServer();
