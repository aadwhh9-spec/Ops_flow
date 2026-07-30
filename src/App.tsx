import { useState, useEffect, useRef } from "react";
import { Project, Task, Member, ChatMessage } from "./types";
import { EN_TO_AR } from "./translations";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Folder,
  CheckSquare,
  MessageSquare,
  Users,
  Search,
  Bell,
  ChevronRight,
  Plus,
  ArrowLeft,
  Send,
  Sparkles,
  Clock,
  LogOut,
  Calendar,
  ShieldAlert,
  Globe,
  UserPlus,
  X,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Briefcase
} from "lucide-react";

export default function App() {
  // Global App States
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth & Role states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "staff">("admin");
  const [loginEmail, setLoginEmail] = useState("ahmed.h@opsflow.io");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");

  // Navigation states
  const [adminView, setAdminView] = useState<string>("dash");
  const [staffView, setStaffView] = useState<string>("dash");
  const [activeProjectKey, setActiveProjectKey] = useState<string>("ecommerce");
  const [activeTaskCategory, setActiveTaskCategory] = useState<"Completed" | "In Progress" | "Not Started">("Completed");
  const [staffFilter, setStaffFilter] = useState<"all" | "done" | "notdone">("all");
  const [tasksFilterProject, setTasksFilterProject] = useState<string>("all");

  // Chat target state
  const [chatType, setChatType] = useState<"proj" | "dm">("proj");
  const [chatTarget, setChatTarget] = useState<string>("ecommerce");
  const [newMessageText, setNewMessageText] = useState("");

  // Modals / Inputs
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteProjId, setInviteProjId] = useState("");

  const [isNewProjModalOpen, setIsNewProjModalOpen] = useState(false);
  const [npName, setNpName] = useState("");
  const [npDesc, setNpDesc] = useState("");
  const [npStart, setNpStart] = useState("");
  const [npEnd, setNpEnd] = useState("");
  const [npColor, setNpColor] = useState("#3B82F6");

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [ntName, setNtName] = useState("");
  const [ntAssignee, setNtAssignee] = useState("");
  const [ntPriority, setNtPriority] = useState<"High" | "Medium" | "Low">("Medium");

  // AI Assistant Floating panel states
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Welcome to OpsFlow Brain! Ask me anything about our projects, tasks, completions, or team members." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEncouragingMsg, setAiEncouragingMsg] = useState("");

  // Collapsible sidebar menus
  const [menuOpen, setMenuOpen] = useState<Record<string, boolean>>({
    dash: true,
    proj: false,
    tasks: false,
    chat: false,
    team: false,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Translation Helper
  const t = (key: string): string => {
    if (lang === "ar") {
      return EN_TO_AR[key] || key;
    }
    return key;
  };
const getDaysRemaining = (endDate: string): { text: string; isOverdue: boolean } => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} days`, isOverdue: true };
    }
    return { text: `${diffDays} days remaining`, isOverdue: false };
  };
  // Fetch full live backend database
  const fetchWorkspace = async () => {
    try {
      const res = await fetch("/api/workspace");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setTasks(data.tasks);
        setMembers(data.members);
        setChats(data.chats);
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats, chatTarget]);

  // Actions
  const handleLogin = () => {
    if (selectedRole === "admin") {
      setIsLoggedIn(true);
      setAdminView("dash");
    } else {
      setIsLoggedIn(true);
      setStaffView("dash");
    }
  };

  const handleSignup = async () => {
    if (!signupName || !signupEmail) return;
    try {
      // Create team member on backend
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          role: "Administrator",
          department: "Management",
        }),
      });
      await fetchWorkspace();
      setIsLoggedIn(true);
      setSelectedRole("admin");
      setAdminView("dash");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async () => {
    if (!npName) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: npName,
          description: npDesc,
          startDate: npStart,
          endDate: npEnd,
          color: npColor,
          team: ["Sara Ahmed"],
        }),
      });
      if (res.ok) {
        setNpName("");
        setNpDesc("");
        setNpStart("");
        setNpEnd("");
        await fetchWorkspace();
        setAdminView("allproj");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async () => {
    if (!ntName) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectKey,
          name: ntName,
          assignedTo: ntAssignee || "Sara Ahmed",
          priority: ntPriority,
        }),
      });
      if (res.ok) {
        setNtName("");
        setIsAddTaskOpen(false);
        await fetchWorkspace();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    let nextStatus: "Completed" | "In Progress" | "Not Started" = "Completed";
    if (currentStatus === "Completed") {
      nextStatus = "In Progress";
    } else if (currentStatus === "In Progress") {
      nextStatus = "Not Started";
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await fetchWorkspace();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) return;
    try {
      const userName = inviteEmail.split("@")[0].replace(".", " ");
      const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName,
          email: inviteEmail,
          role: inviteRole || "Frontend Developer",
          department: "Engineering",
          projectId: inviteProjId || undefined,
        }),
      });
      if (res.ok) {
        setInviteEmail("");
        setInviteRole("");
        setIsInviteModalOpen(false);
        await fetchWorkspace();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChatMessage = async () => {
    if (!newMessageText.trim()) return;
    const senderName = selectedRole === "admin" ? "Ahmed Hassan" : "Sara Ahmed";
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: chatType,
          targetId: chatTarget,
          senderName,
          text: newMessageText,
        }),
      });
      if (res.ok) {
        setNewMessageText("");
        await fetchWorkspace();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ask Gemini with Custom Loading message rotations
  const handleAskGemini = async () => {
    if (!aiInput.trim()) return;
    const q = aiInput;
    setAiInput("");
    setAiMessages((prev) => [...prev, { sender: "user", text: q }]);
    setAiLoading(true);

    const loaders = [
      "Consulting OpsFlow AI engine...",
      "Analyzing project completion metrics...",
      "Calculating active tasks...",
      "Preparing summary response..."
    ];
    let loaderIndex = 0;
    setAiEncouragingMsg(loaders[0]);
    const timer = setInterval(() => {
      loaderIndex = (loaderIndex + 1) % loaders.length;
      setAiEncouragingMsg(loaders[loaderIndex]);
    }, 1500);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      clearInterval(timer);
      if (res.ok) {
        const data = await res.json();
        setAiMessages((prev) => [...prev, { sender: "ai", text: data.answer }]);
      } else {
        setAiMessages((prev) => [...prev, { sender: "ai", text: "I ran into a server error. Please verify the Gemini API Key configuration." }]);
      }
    } catch (err) {
      clearInterval(timer);
      setAiMessages((prev) => [...prev, { sender: "ai", text: "Network connection failed. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSubmenu = (menu: string) => {
    setMenuOpen((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Helper variables for computations
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress").length;
  const notStartedTasks = tasks.filter((t) => t.status === "Not Started").length;

  // Filter tasks based on category in admin tasks view
const filteredTasksForCategory = tasks.filter((t) => t.status === activeTaskCategory && (tasksFilterProject === "all" || t.projectId === tasksFilterProject));
  // Active project detail object
  const activeProject = projects.find((p) => p.id === activeProjectKey) || projects[0];

  // Chats target messages list
  const currentChatMessages = chats.filter((c) => c.type === chatType && c.targetId === chatTarget);

  // Staff tasks computations
  const staffTasksList = tasks.filter((t) => t.assignedTo === "Sara Ahmed");
  const staffCompletedTasksCount = staffTasksList.filter((t) => t.status === "Completed").length;
  const staffTasksProgressPercent = staffTasksList.length > 0 ? Math.round((staffCompletedTasksCount / staffTasksList.length) * 100) : 0;

  // Chronologically filter/sort staff tasks
  const getFilteredStaffTasks = () => {
    let list = [...staffTasksList];
    if (staffFilter === "done") {
      list = list.filter((t) => t.status === "Completed");
    } else if (staffFilter === "notdone") {
      list = list.filter((t) => t.status !== "Completed");
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Dynamic direction
  const isRtl = lang === "ar";
  const directionClass = isRtl ? "rtl" : "ltr";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5F9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading OpsFlow Workspace...</p>
        </div>
      </div>
    );
  }

  // LOGIN / SIGNUP SCREEN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F3F5F9] flex items-center justify-center p-4 relative" dir={directionClass}>
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="absolute top-6 right-6 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-semibold text-gray-700 shadow-sm transition-all flex items-center gap-2"
        >
          <Globe className="w-4 h-4" />
          <span>{lang === "en" ? "العربية" : "English"}</span>
        </button>

        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-800 text-white rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            {isSignupMode ? t("Sign Up") : t("Log In")}
          </h2>
          <p className="text-sm text-center text-gray-500 mb-6">
            {isSignupMode ? "Create an account automatically configured as Admin" : "Enter credentials to access operations hub"}
          </p>

          {!isSignupMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("Email")}</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("Password")}</label>
                <input
                  type="password"
                  value="••••••••"
                  readOnly
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>
<div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => alert(t("Password reset link will be sent to your email (feature pending backend integration)"))}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t("Forgot password?")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  onClick={() => {
                    setSelectedRole("admin");
                    setLoginEmail("ahmed.h@opsflow.io");
                  }}
                  className={`py-2 px-3 rounded-xl border-2 font-semibold text-xs tracking-wide transition-all ${
                    selectedRole === "admin"
                      ? "bg-[#0E1526] text-white border-[#0E1526]"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t("Admin")} (Ahmed)
                </button>
                <button
                  onClick={() => {
                    setSelectedRole("staff");
                    setLoginEmail("sara.a@opsflow.io");
                  }}
                  className={`py-2 px-3 rounded-xl border-2 font-semibold text-xs tracking-wide transition-all ${
                    selectedRole === "staff"
                      ? "bg-[#0E1526] text-white border-[#0E1526]"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t("Staff")} (Sara)
                </button>
              </div>

              <button
                onClick={handleLogin}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{t("Log In")}</span>
              </button>

              <div className="text-center mt-4">
                <button
                  onClick={() => setIsSignupMode(true)}
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Need an Admin account? <span className="font-bold text-blue-600 hover:underline">Register now</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("Email")}</label>
                <input
                  type="email"
                  placeholder="email@opsflow.io"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("Password")}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <button
                onClick={handleSignup}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{t("Create Account")}</span>
              </button>

              <div className="text-center mt-4">
                <button
                  onClick={() => setIsSignupMode(false)}
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  Already have an account? <span className="font-bold text-blue-600 hover:underline">Log In</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDER MAIN APPLICATION LAYOUT
  return (
    <div className={`min-h-screen bg-[#F3F5F9] flex text-gray-800 ${isRtl ? "font-sans" : "font-sans"}`} dir={directionClass}>
      
      {/* SIDEBAR */}
      <aside className="w-[260px] bg-[#0E1526] text-white flex flex-col flex-shrink-0 relative overflow-y-auto">
        {/* Brand Banner */}
        <div className="p-6 border-b border-gray-800/60 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-blue-700 text-white rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight">OpsFlow</h1>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t("Operations Hub")}</p>
          </div>
        </div>

        {/* Sidebar Menu Navigation */}
        {selectedRole === "admin" ? (
          // ADMIN SIDEBAR NAVIGATION
          <nav className="flex-1 p-4 space-y-1">
            {/* Dashboard Collapsible Sub */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("dash");
                  setAdminView("dash");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  adminView === "dash" || adminView === "dash-projects" || adminView === "teammembers" || adminView === "dash-tasks"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4.5 h-4.5" />
                  <span>{t("Dashboard")}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${menuOpen.dash ? "rotate-90" : ""}`} />
              </button>

              {menuOpen.dash && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => setAdminView("dash")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "dash" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setAdminView("dash-projects")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "dash-projects" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Total Projects
                  </button>
                  <button
                    onClick={() => setAdminView("teammembers")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "teammembers" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Team Members
                  </button>
                  <button
                    onClick={() => setAdminView("dash-tasks")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "dash-tasks" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Total Tasks
                  </button>
                </div>
              )}
            </div>

            {/* Projects Collapsible */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("proj");
                  setAdminView("allproj");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  adminView === "allproj" || adminView === "newproj" || adminView === "projectdetail"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-4.5 h-4.5" />
                  <span>Projects</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${menuOpen.proj ? "rotate-90" : ""}`} />
              </button>

              {menuOpen.proj && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => setAdminView("newproj")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "newproj" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    New Project
                  </button>
                  <button
                    onClick={() => setAdminView("allproj")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "allproj" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    All Projects
                  </button>
                </div>
              )}
            </div>

            {/* Tasks Collapsible */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("tasks");
                  setAdminView("tasks");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  adminView === "tasks" ? "bg-[#1A2338] text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4.5 h-4.5" />
                  <span>Tasks</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${menuOpen.tasks ? "rotate-90" : ""}`} />
              </button>

              {menuOpen.tasks && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTaskCategory("Completed");
                      setAdminView("tasks");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "tasks" && activeTaskCategory === "Completed" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => {
                      setActiveTaskCategory("In Progress");
                      setAdminView("tasks");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "tasks" && activeTaskCategory === "In Progress" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => {
                      setActiveTaskCategory("Not Started");
                      setAdminView("tasks");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "tasks" && activeTaskCategory === "Not Started" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Not Started
                  </button>
                </div>
              )}
            </div>

            {/* Chats Navigation */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("chat");
                  setAdminView("chatprojects");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  adminView === "chatprojects" || adminView === "chatcontacts"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4.5 h-4.5" />
                  <span>Chat</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${menuOpen.chat ? "rotate-90" : ""}`} />
              </button>

              {menuOpen.chat && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => {
                      setChatType("proj");
                      setChatTarget("ecommerce");
                      setAdminView("chatprojects");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "chatprojects" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Team Projects
                  </button>
                  <button
                    onClick={() => {
                      setChatType("dm");
                      setChatTarget("sara");
                      setAdminView("chatcontacts");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "chatcontacts" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Direct Contacts
                  </button>
                </div>
              )}
            </div>

            {/* Team Navigation */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("team");
                  setAdminView("teamadmin");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  adminView === "teamadmin" || adminView === "teammembers"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4.5 h-4.5" />
                  <span>Team</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${menuOpen.team ? "rotate-90" : ""}`} />
              </button>

              {menuOpen.team && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => setAdminView("teamadmin")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "teamadmin" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Admin List
                  </button>
                  <button
                    onClick={() => setAdminView("teammembers")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "teammembers" ? "text-blue-400" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Team Members
                  </button>
                </div>
              )}
            </div>
          </nav>
        ) : (
          // STAFF SIDEBAR NAVIGATION
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setStaffView("dash")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                staffView === "dash" ? "bg-[#1A2338] text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/35"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>{t("Dashboard")}</span>
            </button>

            <div>
              <button
                onClick={() => {
                  toggleSubmenu("chat");
                  setStaffView("chatprojects");
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  staffView === "chatprojects" || staffView === "chatcontacts"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4.5 h-4.5" />
                  <span>Chat</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${menuOpen.chat ? "rotate-90" : ""}`} />
              </button>

              {menuOpen.chat && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => {
                      setChatType("proj");
                      setChatTarget("ecommerce");
                      setStaffView("chatprojects");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      staffView === "chatprojects" ? "text-blue-400" : "text-gray-400"
                    }`}
                  >
                    Team Projects
                  </button>
                  <button
                    onClick={() => {
                      setChatType("dm");
                      setChatTarget("omar");
                      setStaffView("chatcontacts");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      staffView === "chatcontacts" ? "text-blue-400" : "text-gray-400"
                    }`}
                  >
                    Direct Contacts
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setStaffView("teammembers")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                staffView === "teammembers" ? "bg-[#1A2338] text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/35"
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Team Members</span>
            </button>
          </nav>
        )}

        {/* Profile / Logout section */}
        <div className="p-4 border-t border-gray-800/60 mt-auto">
          <div className="flex items-center gap-3 p-2 bg-[#1A2338] rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs">
              {selectedRole === "admin" ? "AH" : "SA"}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate">{selectedRole === "admin" ? "Ahmed Hassan" : "Sara Ahmed"}</h4>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">{selectedRole === "admin" ? "Super Admin" : "Staff"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setSelectedRole("admin");
            }}
            className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isRtl ? "تسجيل الخروج" : "Log Out"}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen relative overflow-y-auto">
        
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-gray-100 px-8 flex items-center justify-between flex-shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <span>{selectedRole === "admin" ? "Dashboard" : "Staff Portal"}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <b className="text-gray-900 font-bold capitalize">
              {selectedRole === "admin" ? t(adminView) : t(staffView)}
            </b>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-4">
            <div className="relative bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-gray-400 min-w-[200px]">
              <Search className="w-3.5 h-3.5" />
              <input
                type="text"
                placeholder={t("Quick search...")}
                className="bg-transparent border-none text-xs w-full focus:outline-none text-gray-700"
              />
            </div>

            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-xs font-bold text-gray-700 transition-all flex items-center gap-1 shadow-sm"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "العربية" : "EN"}</span>
            </button>

            <div className="relative p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-100 cursor-pointer transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
              {selectedRole === "admin" ? "AH" : "SA"}
            </div>
          </div>
        </header>

        {/* CONTENT VIEW AREA */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole === "admin" ? adminView : staffView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {selectedRole === "admin" ? (
                // --- ADMIN ROUTING views ---
                <>
                  {/* ADMIN VIEW: OVERVIEW */}
                  {adminView === "dash" && (
                    <div className="space-y-6">
                      {/* Metric cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div
                          onClick={() => setAdminView("dash-projects")}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
                        >
                          <span className="absolute top-4 right-4 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">+1 this month</span>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("Total Projects")}</p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{totalProjects}</h3>
                          <p className="text-xs text-gray-500 mt-1">Active pipelines</p>
                        </div>

                        <div
                          onClick={() => setAdminView("teammembers")}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
                        >
                          <span className="absolute top-4 right-4 text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">+2 onboarding</span>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("Team Members")}</p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{members.length}</h3>
                          <p className="text-xs text-gray-500 mt-1">Direct operators</p>
                        </div>

                        <div
                          onClick={() => {
                            setActiveTaskCategory("Completed");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
                        >
                          <span className="absolute top-4 right-4 text-xs font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                            {Math.round((completedTasks / totalTasks) * 100)}% done
                          </span>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Tasks</p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{completedTasks}</h3>
                          <p className="text-xs text-gray-500 mt-1">Sprint completion</p>
                        </div>

                        <div
                          onClick={() => {
                            setActiveTaskCategory("In Progress");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
                        >
                          <span className="absolute top-4 right-4 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                            {inProgressTasks} active
                          </span>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">In Progress</p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">{inProgressTasks}</h3>
                          <p className="text-xs text-gray-500 mt-1">Awaiting dispatch</p>
                        </div>
                      </div>

                      {/* Main visual layouts */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Interactive Task Distribution card */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4">
                          <h3 className="text-base font-extrabold text-gray-900">{t("Task Distribution")}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Click a section to inspect tasks</p>

                          <div className="my-8 flex justify-center">
                            {/* SVG Donut representation */}
                            <div className="relative w-36 h-36">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="3" />
                                {/* Completed section (green) */}
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="#22C55E"
                                  strokeWidth="3.5"
                                  strokeDasharray={`${Math.round((completedTasks / totalTasks) * 100)} ${100 - Math.round((completedTasks / totalTasks) * 100)}`}
                                  strokeDashoffset="0"
                                />
                                {/* In Progress section (blue) */}
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="#3B82F6"
                                  strokeWidth="3.5"
                                  strokeDasharray={`${Math.round((inProgressTasks / totalTasks) * 100)} ${100 - Math.round((inProgressTasks / totalTasks) * 100)}`}
                                  strokeDashoffset={`-${Math.round((completedTasks / totalTasks) * 100)}`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-gray-900">{totalTasks}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Tasks</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mt-4">
                            <div
                              onClick={() => {
                                setActiveTaskCategory("Completed");
                                setAdminView("tasks");
                              }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                                <span className="text-xs font-bold text-gray-700">{t("Completed")}</span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">{completedTasks}</span>
                            </div>

                            <div
                              onClick={() => {
                                setActiveTaskCategory("In Progress");
                                setAdminView("tasks");
                              }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                <span className="text-xs font-bold text-gray-700">{t("In Progress")}</span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">{inProgressTasks}</span>
                            </div>

                            <div
                              onClick={() => {
                                setActiveTaskCategory("Not Started");
                                setAdminView("tasks");
                              }}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                                <span className="text-xs font-bold text-gray-700">{t("Not Started")}</span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">{notStartedTasks}</span>
                            </div>
                          </div>
                        </div>

                        {/* Active Projects List */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-8">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-extrabold text-gray-900">{t("Active Projects")}</h3>
                            <button
                              onClick={() => setAdminView("allproj")}
                              className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>{t("View all")}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-4">
                            {projects.map((proj) => (
                              <div
                                key={proj.id}
                                onClick={() => {
                                  setActiveProjectKey(proj.id);
                                  setAdminView("projectdetail");
                                }}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100/70 cursor-pointer transition-all border border-gray-100 gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color }}></span>
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-sm text-gray-900 truncate">{proj.name}</h4>
                                    <p className="text-xs text-gray-500 truncate max-w-sm">{proj.description}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="text-right">
                                    <span className="text-xs font-extrabold text-gray-800">{proj.progress}%</span>
                                    <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${proj.progress}%`, backgroundColor: proj.color }}></div>
                                    </div>
                                  </div>

                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    proj.status === "In Progress"
                                      ? "bg-blue-50 text-blue-600"
                                      : proj.status === "Review"
                                      ? "bg-purple-50 text-purple-600"
                                      : proj.status === "Completed"
                                      ? "bg-green-50 text-green-600"
                                      : "bg-gray-100 text-gray-500"
                                  }`}>
                                    {proj.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: TOTAL PROJECTS SUMMARY STATS */}
                  {adminView === "dash-projects" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">{t("Total Projects")}</h2>
                        <button
                          onClick={() => setAdminView("newproj")}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t("New Project")}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">In Progress</p>
                          <h3 className="text-2xl font-black text-blue-600 mt-1">{projects.filter(p => p.status === "In Progress").length}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Review Stage</p>
                          <h3 className="text-2xl font-black text-purple-600 mt-1">{projects.filter(p => p.status === "Review").length}</h3>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Planning Stage</p>
                          <h3 className="text-2xl font-black text-gray-500 mt-1">{projects.filter(p => p.status === "Planning").length}</h3>
                        </div>
                      </div>

                      {/* Projects Table Grid */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50">
                          <h3 className="font-extrabold text-sm text-gray-900">Project Master List</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50/55 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="p-4 pl-6">Project Name</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Timeline</th>
                                <th className="p-4">Progress</th>
                                <th className="p-4">Allocated Staff</th>
                                <th className="p-4 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projects.map((proj) => (
                                <tr
                                  key={proj.id}
                                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-all text-xs"
                                >
                                  <td className="p-4 pl-6 font-bold text-gray-900 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color }}></span>
                                      <span>{proj.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      proj.status === "In Progress" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                                    }`}>
                                      {proj.status}
                                    </span>
                                  </td>
                                <td className="p-4 text-gray-500">
  {proj.startDate} - {proj.endDate}
  <div className={`text-[10px] font-semibold mt-1 ${getDaysRemaining(proj.endDate).isOverdue ? "text-red-500" : "text-gray-400"}`}>
    {getDaysRemaining(proj.endDate).text}
  </div>
</td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold">{proj.progress}%</span>
                                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${proj.progress}%`, backgroundColor: proj.color }}></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex -space-x-1 overflow-hidden">
                                      {proj.team.map((n, idx) => (
                                        <div
                                          key={idx}
                                          title={n}
                                          className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-600 text-white font-black text-[9px] flex items-center justify-center"
                                        >
                                          {n.split(" ").map(word => word[0]).join("")}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => {
                                        setActiveProjectKey(proj.id);
                                        setAdminView("projectdetail");
                                      }}
                                      className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold text-[10px] transition-all"
                                    >
                                      Manage
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: ALL PROJECTS LIST */}
                  {adminView === "allproj" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{t("All Projects")}</h2>
                          <p className="text-xs text-gray-500">Track and dispatch active operational tasks</p>
                        </div>
                        <button
                          onClick={() => setAdminView("newproj")}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t("New Project")}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((proj) => (
                          <div
                            key={proj.id}
                            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="w-4.5 h-4.5 rounded-lg flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `${proj.color}20`, color: proj.color }}>📁</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                proj.status === "In Progress" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                              }`}>
                                {proj.status}
                              </span>
                            </div>

                            <h3 className="font-extrabold text-sm text-gray-900 mb-1">{proj.name}</h3>
                            <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-grow">{proj.description}</p>

                            <div className="space-y-3 mt-auto">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Progress</span>
                                <span className="font-bold text-gray-900">{proj.progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${proj.progress}%`, backgroundColor: proj.color }}></div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                                <span className="text-gray-400 font-semibold">{proj.startDate} – {proj.endDate}</span>
                                <button
                                  onClick={() => {
                                    setActiveProjectKey(proj.id);
                                    setAdminView("projectdetail");
                                  }}
                                  className="text-blue-600 hover:underline font-bold"
                                >
                                  Inspect Details ›
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: PROJECT DEEP DIVE DETAILED PAGE */}
                  {adminView === "projectdetail" && (
                    <div className="space-y-6">
                      <button
                        onClick={() => setAdminView("allproj")}
                        className="flex items-center gap-2 text-xs font-extrabold text-gray-700 hover:text-gray-900 transition-all bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl shadow-sm"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Projects</span>
                      </button>

                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-50 gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: activeProject.color }}></span>
                              <h2 className="text-xl font-bold text-gray-900">{activeProject.name}</h2>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 max-w-2xl">{activeProject.description}</p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs font-bold text-gray-500">Completion</span>
                              <h4 className="text-lg font-black text-gray-900 mt-0.5">{activeProject.progress}%</h4>
                            </div>
                            <div className="w-20 h-20 relative">
                              {/* SVG Donut */}
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#F1F5F9" strokeWidth="4" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  style={{ stroke: activeProject.color }}
                                  strokeWidth="4"
                                  strokeDasharray={`${activeProject.progress} ${100 - activeProject.progress}`}
                                  strokeDashoffset="0"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
                          {/* Project Team */}
                          <div className="lg:col-span-4 space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">Project Team</h3>
                              <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Member</span>
                              </button>
                            </div>

                            <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                              {activeProject.team.map((name, idx) => {
                                const matchedMember = members.find((m) => m.name === name);
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 text-xs shadow-sm"
                                  >
                                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center">
                                      {name.split(" ").map(word => word[0]).join("")}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-900">{name}</h4>
                                      <p className="text-[10px] text-gray-400 font-semibold">{matchedMember?.role || "Staff Member"}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Project Tasks */}
                          <div className="lg:col-span-8 space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">Tasks Pipeline</h3>
                              <button
                                onClick={() => setIsAddTaskOpen(true)}
                                className="px-3 py-1.5 bg-[#0E1526] hover:bg-gray-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create Task</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {tasks.filter((t) => t.projectId === activeProject.id).length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                  No tasks allocated to this project yet. Click Create Task above.
                                </p>
                              ) : (
                                tasks
                                  .filter((t) => t.projectId === activeProject.id)
                                  .map((task) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/60 rounded-xl border border-gray-100 transition-all text-xs"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <button
                                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                            task.status === "Completed"
                                              ? "bg-green-500 border-green-500 text-white"
                                              : task.status === "In Progress"
                                              ? "border-blue-500 text-blue-500"
                                              : "border-gray-300"
                                          }`}
                                        >
                                          {task.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                                          {task.status === "In Progress" && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        </button>

                                        <div className="min-w-0">
                                          <h4 className={`font-bold text-gray-900 truncate ${task.status === "Completed" ? "line-through text-gray-400 font-normal" : ""}`}>
                                            {task.name}
                                          </h4>
                                          <p className="text-[10px] text-gray-400 font-medium">{task.assignedTo}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                          task.priority === "High" ? "bg-red-50 text-red-600" : task.priority === "Medium" ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"
                                        }`}>
                                          {task.priority}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: NEW PROJECT FORM PANEL */}
                  {adminView === "newproj" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAdminView("allproj")}
                          className="p-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg shadow-sm transition-all"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900">{t("New Project")}</h2>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-2xl">
                        <h3 className="font-extrabold text-sm text-gray-900 mb-4">{t("Project Details")}</h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("Project Name")}</label>
                            <input
                              type="text"
                              value={npName}
                              onChange={(e) => setNpName(e.target.value)}
                              placeholder="e.g. E-Commerce Redesign"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("Description")}</label>
                            <textarea
                              value={npDesc}
                              onChange={(e) => setNpDesc(e.target.value)}
                              placeholder="Describe project details..."
                              rows={3}
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 font-medium"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("Start Date")}</label>
                              <input
                                type="date"
                                value={npStart}
                                onChange={(e) => setNpStart(e.target.value)}
                                placeholder="Jun 1"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">{t("End Date")}</label>
                              <input
                                type="date"
                                value={npEnd}
                                onChange={(e) => setNpEnd(e.target.value)}
                                placeholder="Aug 15"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-wider">{t("Color Label")}</label>
                            <div className="flex gap-2.5">
                              {["#3B82F6", "#22C55E", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"].map((col) => (
                                <button
                                  key={col}
                                  onClick={() => setNpColor(col)}
                                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                                    npColor === col ? "border-gray-800 scale-110 shadow-sm" : "border-transparent"
                                  }`}
                                  style={{ backgroundColor: col }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 flex gap-3">
                            <button
                              onClick={() => setAdminView("allproj")}
                              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all text-center"
                            >
                              {t("Cancel")}
                            </button>
                            <button
                              onClick={selectedRole === "staff" ? () => alert(t("You do not have permission to create projects.")) : handleCreateProject}
          className={`flex-grow py-2.5 font-bold text-xs rounded-xl shadow-sm transition-colors ${selectedRole === "staff" ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-[#0E1526] hover:bg-gray-800 text-white"}`}
        >
                              {t("Save Project")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: TOTAL TASKS DISTRIBUTION GRID */}
                  {adminView === "dash-tasks" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-gray-900">{t("Total Tasks")}</h2>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div
                          onClick={() => {
                            setActiveTaskCategory("Completed");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center cursor-pointer hover:shadow-md transition-all"
                        >
                          <span className="text-green-500 font-extrabold text-xs">Completed</span>
                          <h3 className="text-3xl font-black text-green-600 mt-2">{completedTasks}</h3>
                        </div>

                        <div
                          onClick={() => {
                            setActiveTaskCategory("In Progress");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center cursor-pointer hover:shadow-md transition-all"
                        >
                          <span className="text-blue-500 font-extrabold text-xs">In Progress</span>
                          <h3 className="text-3xl font-black text-blue-600 mt-2">{inProgressTasks}</h3>
                        </div>

                        <div
                          onClick={() => {
                            setActiveTaskCategory("Not Started");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center cursor-pointer hover:shadow-md transition-all"
                        >
                          <span className="text-gray-400 font-extrabold text-xs">Not Started</span>
                          <h3 className="text-3xl font-black text-gray-500 mt-2">{notStartedTasks}</h3>
                        </div>
                      </div>

                      {/* Complete List of Sprint Tasks */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-extrabold text-sm text-gray-900 mb-4">Complete Task Catalog ({totalTasks})</h3>
                        <div className="space-y-3">
                          {tasks.map((task) => {
                            const matchedProj = projects.find((p) => p.id === task.projectId);
                            return (
                              <div
                                key={task.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/60 rounded-xl border border-gray-100 transition-all text-xs gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <button
                                    onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                      task.status === "Completed"
                                        ? "bg-green-500 border-green-500 text-white"
                                        : task.status === "In Progress"
                                        ? "border-blue-500 text-blue-500"
                                        : "border-gray-300"
                                    }`}
                                  >
                                    {task.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {task.status === "In Progress" && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                  </button>

                                  <div className="min-w-0">
                                    <h4 className={`font-bold text-gray-900 truncate ${task.status === "Completed" ? "line-through text-gray-400 font-normal" : ""}`}>
                                      {task.name}
                                    </h4>
                                    <span
                                      className="text-[9px] font-bold uppercase tracking-wider block mt-0.5"
                                      style={{ color: matchedProj?.color }}
                                    >
                                      {matchedProj?.name || "Global Project"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="text-right">
                                    <p className="font-bold text-gray-800">{task.assignedTo}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">Sprint Allocation</p>
                                  </div>

                                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                                    task.priority === "High" ? "bg-red-50 text-red-600" : task.priority === "Medium" ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600"
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: SUB TASKS CATEGORIES (COMPLETED / IN PROGRESS / NOT STARTED) */}
                  {adminView === "tasks" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 capitalize">Tasks: {t(activeTaskCategory)}</h2>
                          <p className="text-xs text-gray-500">Dispatch and verify pipeline completions</p>
                        </div>
                        <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setActiveTaskCategory("Completed")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        activeTaskCategory === "Completed"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {t("Completed")}
                    </button>
                    <button
                      onClick={() => setActiveTaskCategory("In Progress")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        activeTaskCategory === "In Progress"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {t("In Progress")}
                    </button>
                    <button
                      onClick={() => setActiveTaskCategory("Not Started")}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        activeTaskCategory === "Not Started"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {t("Not Started")}
                    </button>
                  </div>
                        <span className={`px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600`}>
                          {filteredTasksForCategory.length} tasks cataloged
                        </span>
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="space-y-3">
                          {filteredTasksForCategory.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-10">No tasks currently fit this category.</p>
                          ) : (
                            filteredTasksForCategory.map((task) => {
                              const matchedProj = projects.find((p) => p.id === task.projectId);
                              return (
                                <div
                                  key={task.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/60 rounded-xl border border-gray-100 transition-all text-xs gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-blue-500 text-blue-500 transition-all flex-shrink-0"
                                    >
                                      {task.status === "Completed" ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                      ) : (
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                      )}
                                    </button>
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-gray-900 truncate">{task.name}</h4>
                                      <span
                                        className="text-[9px] font-semibold uppercase tracking-wider block mt-0.5"
                                        style={{ color: matchedProj?.color }}
                                      >
                                        {matchedProj?.name}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    <span className="font-bold text-gray-800">{task.assignedTo}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      task.priority === "High" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                                    }`}>
                                      {task.priority}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: CHAT GROUP & DM WORKSPACE */}
                  {(adminView === "chatprojects" || adminView === "chatcontacts") && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">{adminView === "chatprojects" ? t("Team Projects") : t("Direct Contacts")}</h2>
                        <span className="text-xs text-gray-500">Real-time collaboration panel</span>
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[560px]">
                        {/* Conversations list Left Sidebar */}
                        <div className="md:col-span-4 border-r border-gray-100 flex flex-col h-full bg-[#FAFBFD]">
                          <div className="p-4 border-b border-gray-100 bg-white">
                            <div className="relative bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-gray-400">
                              <Search className="w-3.5 h-3.5" />
                              <input type="text" placeholder="Search message rooms..." className="bg-transparent border-none text-xs w-full focus:outline-none" />
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {adminView === "chatprojects" ? (
                              // Project Groups list
                              projects.map((proj) => (
                                <div
                                  key={proj.id}
                                  onClick={() => {
                                    setChatType("proj");
                                    setChatTarget(proj.id);
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                    chatType === "proj" && chatTarget === proj.id ? "bg-blue-50" : "hover:bg-gray-100/60"
                                  }`}
                                >
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-extrabold flex-shrink-0" style={{ backgroundColor: proj.color }}>
                                    💬
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline">
                                      <h4 className="font-bold text-xs text-gray-900 truncate">{proj.name}</h4>
                                      <span className="text-[9px] text-gray-400">9:21 AM</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Project development group chat</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              // DMs members list
                              members.map((m) => (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    setChatType("dm");
                                    setChatTarget(m.id);
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                    chatType === "dm" && chatTarget === m.id ? "bg-blue-50" : "hover:bg-gray-100/60"
                                  }`}
                                >
                                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center flex-shrink-0 relative">
                                    {m.name.split(" ").map(w => w[0]).join("")}
                                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                      m.status === "Active" ? "bg-green-500" : "bg-orange-500"
                                    }`}></span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline">
                                      <h4 className="font-bold text-xs text-gray-900 truncate">{m.name}</h4>
                                      <span className="text-[9px] text-gray-400">9:10 AM</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{m.role}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Interactive Main chat screen Right */}
                        <div className="md:col-span-8 flex flex-col h-full bg-white">
                          {/* Chat Header */}
                          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                {chatType === "proj" ? "💬" : "SA"}
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-gray-900">
                                  {chatType === "proj" ? projects.find(p => p.id === chatTarget)?.name : members.find(m => m.id === chatTarget)?.name}
                                </h4>
                                <p className="text-[10px] text-gray-400 font-medium">Real-time communication room</p>
                              </div>
                            </div>
                          </div>

                          {/* Chat Messages flow */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {currentChatMessages.map((msg) => {
                              const isMe = msg.sender.name === "Ahmed Hassan";
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex items-start gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                                >
                                  {!isMe && (
                                    <div
                                      className="w-7 h-7 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: msg.sender.color }}
                                    >
                                      {msg.sender.initials}
                                    </div>
                                  )}

                                  <div className={`space-y-1 ${isMe ? "text-right" : ""}`}>
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="text-[10px] font-bold text-gray-900">{msg.sender.name}</span>
                                      <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                                    </div>
                                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                      isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
                                    }`}>
                                      {msg.text}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={chatEndRef} />
                          </div>

                          {/* Message Typing Input */}
                          <div className="p-4 border-t border-gray-100 flex gap-2">
                            <input
                              type="text"
                              value={newMessageText}
                              onChange={(e) => setNewMessageText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                              placeholder="Type your message..."
                              className="flex-grow px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            />
                            <button
                              onClick={handleSendChatMessage}
                              className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center transition-all shadow-sm"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: ADMIN STAFF DIRECTORY LIST */}
                  {adminView === "teamadmin" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">{t("Administrators")}</h2>
                        <button
                          onClick={() => setIsInviteModalOpen(true)}
                          className="px-4 py-2 bg-[#0E1526] hover:bg-gray-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-all"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Add Admin</span>
                        </button>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                        {/* Ahmed Hassan Card */}
                        <div className="pb-6 border-b border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                              AH
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-gray-900">Ahmed Hassan</h3>
                              <p className="text-xs text-gray-400">ahmed.h@opsflow.io · Admin since Jan 2024</p>
                            </div>
                          </div>

                          <div className="mt-4 ml-16 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Managed Pipelines</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {projects.slice(0, 2).map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100">
                                  <span className="font-semibold text-gray-700">{p.name}</span>
                                  <span className="font-bold text-blue-500">{p.progress}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Nadia Qasim Card */}
                        <div>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                              NQ
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-gray-900">Nadia Qasim</h3>
                              <p className="text-xs text-gray-400">nadia.q@opsflow.io · Admin since Mar 2023</p>
                            </div>
                          </div>

                          <div className="mt-4 ml-16 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Managed Pipelines</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {projects.slice(2, 5).map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100">
                                  <span className="font-semibold text-gray-700">{p.name}</span>
                                  <span className="font-bold text-blue-500">{p.progress}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ADMIN VIEW: TEAM MEMBERS DIRECTORY CARD GRID */}
                  {adminView === "teammembers" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{t("Team Members Overview")}</h2>
                          <p className="text-xs text-gray-500">Track task loading and availability across operators</p>
                        </div>
                        <button
                          onClick={() => setIsInviteModalOpen(true)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t("Invite Team Member")}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {members.map((m) => {
                          const assignedTasks = tasks.filter((t) => t.assignedTo === m.name);
                          const completedCount = assignedTasks.filter((t) => t.status === "Completed").length;
                          const completionRate = assignedTasks.length > 0 ? Math.round((completedCount / assignedTasks.length) * 100) : 0;

                          return (
                            <div
                              key={m.id}
                              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-all"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-extrabold text-xs flex items-center justify-center shadow-inner">
                                    {m.name.split(" ").map(w => w[0]).join("")}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-sm text-gray-900">{m.name}</h3>
                                    <p className="text-[10px] text-gray-400 font-semibold">{m.role} · {m.department}</p>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                  m.status === "Active" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                                }`}>
                                  {m.status}
                                </span>
                              </div>

                              <div className="space-y-2 mt-auto">
                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                  <span>Task Completion</span>
                                  <span className="font-bold text-gray-900">{completionRate}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${completionRate}%` }}></div>
                                </div>

                                <div className="flex justify-between pt-3 border-t border-gray-50 text-[10px] text-gray-400 font-semibold">
                                  <span>{assignedTasks.length} Assigned Tasks</span>
                                  <span>Joined {m.since}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // --- STAFF ROUTING views ---
                <>
                  {/* STAFF VIEW: DASHBOARD */}
                  {staffView === "dash" && (
                    <div className="space-y-6">
                      {/* My Projects */}
                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-extrabold text-sm text-gray-900 mb-4">{t("My Projects")}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects
                            .filter((p) => p.team.includes("Sara Ahmed"))
                            .map((p) => (
                              <div key={p.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                                  <span className="font-bold text-gray-800">{p.name}</span>
                                </div>
                                <span className="font-bold text-blue-500">{p.progress}%</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* My Tasks progress and listings */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Task Progress Donut */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4">
                          <h3 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">My Completion Rate</h3>
                          <p className="text-[10px] text-gray-400 mt-0.5">Completions across all sprint tasks</p>

                          <div className="my-6 flex justify-center">
                            <div className="relative w-32 h-32">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#F1F5F9" strokeWidth="4" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="#22C55E"
                                  strokeWidth="4"
                                  strokeDasharray={`${staffTasksProgressPercent} ${100 - staffTasksProgressPercent}`}
                                  strokeDashoffset="0"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-gray-900">{staffTasksProgressPercent}%</span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase">Done</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-center text-xs text-gray-500">
                            <b>{staffCompletedTasksCount}</b> out of <b>{staffTasksList.length}</b> tasks completed
                          </div>
                        </div>

                        {/* List Sorted by Date */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-8">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                            <h3 className="font-extrabold text-sm text-gray-900">{t("My Tasks")}</h3>
                            {/* Filter tabs */}
                            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
                              <button
                                onClick={() => setStaffFilter("all")}
                                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                  staffFilter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                All
                              </button>
                              <button
                                onClick={() => setStaffFilter("done")}
                                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                  staffFilter === "done" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                Done
                              </button>
                              <button
                                onClick={() => setStaffFilter("notdone")}
                                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                  staffFilter === "notdone" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                Remaining
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {getFilteredStaffTasks().length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                No tasks matched the category filters.
                              </p>
                            ) : (
                              getFilteredStaffTasks().map((t) => {
                                const matchedProj = projects.find((p) => p.id === t.projectId);
                                return (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/70 rounded-xl border border-gray-100 transition-all text-xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <button
                                        onClick={() => handleToggleTaskStatus(t.id, t.status)}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                          t.status === "Completed"
                                            ? "bg-[#22C55E] border-[#22C55E] text-white"
                                            : "border-gray-300"
                                        }`}
                                      >
                                        {t.status === "Completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                                      </button>
                                      <div className="min-w-0">
                                        <h4 className={`font-bold text-gray-900 truncate ${t.status === "Completed" ? "line-through text-gray-400 font-normal" : ""}`}>
                                          {t.name}
                                        </h4>
                                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-0.5" style={{ color: matchedProj?.color }}>
                                          {matchedProj?.name} · {t.date}
                                        </span>
                                      </div>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      t.priority === "High" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                                    }`}>
                                      {t.priority}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAFF VIEW: CHAT GROUPS & CONTACTS */}
                  {(staffView === "chatprojects" || staffView === "chatcontacts") && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[560px]">
                        {/* Conversation lists Left */}
                        <div className="md:col-span-4 border-r border-gray-100 flex flex-col h-full bg-[#FAFBFD]">
                          <div className="p-4 bg-white border-b border-gray-100">
                            <h3 className="font-extrabold text-sm text-gray-900 mb-2">My Conversations</h3>
                            <div className="relative bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-gray-400">
                              <Search className="w-3.5 h-3.5" />
                              <input type="text" placeholder="Search direct rooms..." className="bg-transparent border-none text-xs w-full focus:outline-none" />
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {staffView === "chatprojects" ? (
                              projects.map((proj) => (
                                <div
                                  key={proj.id}
                                  onClick={() => {
                                    setChatType("proj");
                                    setChatTarget(proj.id);
                                  }}
                                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                    chatType === "proj" && chatTarget === proj.id ? "bg-blue-50" : "hover:bg-gray-100/60"
                                  }`}
                                >
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-extrabold flex-shrink-0" style={{ backgroundColor: proj.color }}>
                                    💬
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-baseline">
                                      <h4 className="font-bold text-xs text-gray-900 truncate">{proj.name}</h4>
                                      <span className="text-[9px] text-gray-400">9:21 AM</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Group chat</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              // Contact direct conversations list for staff
                              members.map((m) => {
                                if (m.name === "Sara Ahmed") return null;
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => {
                                      setChatType("dm");
                                      setChatTarget(m.id);
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                      chatType === "dm" && chatTarget === m.id ? "bg-blue-50" : "hover:bg-gray-100/60"
                                    }`}
                                  >
                                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center flex-shrink-0">
                                      {m.name.split(" ").map(w => w[0]).join("")}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-bold text-xs text-gray-900 truncate">{m.name}</h4>
                                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{m.role}</p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Message screen Right */}
                        <div className="md:col-span-8 flex flex-col h-full bg-white">
                          <div className="p-4 border-b border-gray-100">
                            <h4 className="font-bold text-xs text-gray-900">
                              {chatType === "proj" ? projects.find(p => p.id === chatTarget)?.name : members.find(m => m.id === chatTarget)?.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-medium">OpsFlow live communication channel</p>
                          </div>

                          {/* Messages Flow */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {currentChatMessages.map((msg) => {
                              const isMe = msg.sender.name === "Sara Ahmed";
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex items-start gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                                >
                                  {!isMe && (
                                    <div
                                      className="w-7 h-7 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: msg.sender.color }}
                                    >
                                      {msg.sender.initials}
                                    </div>
                                  )}

                                  <div className={`space-y-1 ${isMe ? "text-right" : ""}`}>
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="text-[10px] font-bold text-gray-900">{msg.sender.name}</span>
                                      <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                                    </div>
                                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                      isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
                                    }`}>
                                      {msg.text}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={chatEndRef} />
                          </div>

                          {/* Chat Input */}
                          <div className="p-4 border-t border-gray-100 flex gap-2">
                            <input
                              type="text"
                              value={newMessageText}
                              onChange={(e) => setNewMessageText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                              placeholder="Type your message..."
                              className="flex-grow px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                            />
                            <button
                              onClick={handleSendChatMessage}
                              className="px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center transition-all shadow-sm"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAFF VIEW: TEAM MEMBERS COLLEAGUES */}
                  {staffView === "teammembers" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-bold text-gray-900">Workspace Colleagues</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {members.map((m) => (
                          <div key={m.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-xs space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center">
                                {m.name.split(" ").map(w => w[0]).join("")}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{m.name}</h3>
                                <p className="text-[10px] text-gray-400 font-semibold">{m.role} · {m.department}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold">
                              <span>Status: {m.status}</span>
                              <span>Joined {m.since}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* FLOAT SPARKLES AI ASSISTANT PANEL */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsAiOpen(!isAiOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center border border-white/20"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
        </button>

        {isAiOpen && (
          <div className="absolute bottom-16 right-0 w-80 max-h-[460px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h3 className="font-black text-xs uppercase tracking-wider">OpsFlow AI brain</h3>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="text-white hover:text-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Messages flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    msg.sender === "user" ? "bg-purple-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none font-medium"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-tl-none text-xs max-w-[85%] space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-150"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-300"></div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-semibold italic">{aiEncouragingMsg}</p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Input */}
            <div className="p-3 border-t border-gray-50 flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskGemini()}
                placeholder="Ask assistant anything..."
                className="flex-grow px-3 py-2 bg-[#FAFBFD] border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
              />
              <button
                onClick={handleAskGemini}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center justify-center transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: INVITE MEMBER */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-[#0E1526]/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-900">{t("Invite a Team Member")}</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-950">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@opsflow.io"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role / Title</label>
                <input
                  type="text"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder="e.g. Frontend Engineer"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assign to Project (optional)</label>
                <select
                  value={inviteProjId}
                  onChange={(e) => setInviteProjId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleInviteMember}
                  className="flex-1 py-2 bg-[#0E1526] hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  {t("Send Invite")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TASK */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 bg-[#0E1526]/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-900">{t("Add Task")}</h3>
              <button onClick={() => setIsAddTaskOpen(false)} className="text-gray-400 hover:text-gray-950">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Task Name")}</label>
                <input
                  type="text"
                  value={ntName}
                  onChange={(e) => setNtName(e.target.value)}
                  placeholder="e.g. Design payment module"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assignee</label>
                <select
                  value={ntAssignee}
                  onChange={(e) => setNtAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                 {members
  .filter((m) => activeProject.team.includes(m.name))
  .map((m) => (
    <option key={m.id} value={m.name}>{m.name}</option>
  ))} 
                   
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t("Priority")}</label>
                <select
                  value={ntPriority}
                  onChange={(e) => setNtPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsAddTaskOpen(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleAddTask}
                  className="flex-grow py-2 bg-[#0E1526] hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all text-center"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
