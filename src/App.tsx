import { Fragment, useState, useEffect, useRef } from "react";
import { Project, Task, Member, ChatMessage, AppNotification } from "./types";
import { EN_TO_AR } from "./translations";
import { getDaysRemaining } from "./utils";
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
  Briefcase,
  Pencil,
  Trash2,
} from "lucide-react";

export default function App() {
  type AuthUser = {
    id: number;
    name: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
  };

  // Global App States
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [contacts, setContacts] = useState<Member[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth & Role states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "staff">("admin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Navigation states
  const [adminView, setAdminView] = useState<string>("dash");
  const [staffView, setStaffView] = useState<string>("dash");
  const [activeProjectKey, setActiveProjectKey] = useState<string>("ecommerce");
  const [activeTaskCategory, setActiveTaskCategory] = useState<
    "Completed" | "In Progress" | "Not Started"
  >("Completed");
  const [staffFilter, setStaffFilter] = useState<"all" | "done" | "notdone">(
    "all",
  );
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

  const [npName, setNpName] = useState("");
  const [npDesc, setNpDesc] = useState("");
  const [npStart, setNpStart] = useState("");
  const [npEnd, setNpEnd] = useState("");
  const [npColor, setNpColor] = useState("#3B82F6");

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [ntName, setNtName] = useState("");
  const [ntAssignee, setNtAssignee] = useState("");
  const [ntPriority, setNtPriority] = useState<"High" | "Medium" | "Low">(
    "Medium",
  );
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );

  // AI Assistant Floating panel states
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string }>
  >([
    {
      sender: "ai",
      text: "Welcome to OpsFlow Brain! Ask me anything about our projects, tasks, completions, or team members.",
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEncouragingMsg, setAiEncouragingMsg] = useState("");
  const [appError, setAppError] = useState("");

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
  // Fetch full live backend database
  const fetchWorkspace = async () => {
    setAppError("");
    try {
      const res = await fetch("/api/workspace");
      if (!res.ok) {
        throw new Error(`Workspace request failed (${res.status})`);
      }
      const data = await res.json();
      setProjects(data.projects ?? []);
      setTasks(data.tasks ?? []);
      setMembers(data.members ?? []);
      setContacts(data.contacts ?? data.members ?? []);
      setChats(data.chats ?? []);
    } catch (err) {
      console.error("Failed to load workspace data:", err);
      setAppError(
        "Could not connect to the workspace. Check that the backend is running, then try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadNotificationCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("invite") === "1") {
      setLoginEmail(params.get("email") ?? "");
      setIsSignupMode(false);
      setIsResetMode(true);
      setResetCodeSent(true);
      setResetMessage("Enter the invitation code sent to your email, then create your password.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    const restoreSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        const user = data.user as AuthUser;
        setCurrentUser(user);
        setSelectedRole(user.role === "staff" ? "staff" : "admin");
        setIsLoggedIn(true);
        await Promise.all([fetchWorkspace(), fetchNotifications()]);
      } catch (err) {
        console.error("Failed to restore session:", err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = window.setInterval(() => {
      void Promise.all([fetchNotifications(), fetchWorkspace()]);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats, chatTarget]);

  // Actions
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setAppError("Enter your email address and password.");
      return;
    }
    setAppError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Login failed");
      }

      const user = data.user as AuthUser;
      const accountRole = user.role === "staff" ? "staff" : "admin";
      setCurrentUser(user);
      setSelectedRole(accountRole);
      setIsLoggedIn(true);
      accountRole === "admin" ? setAdminView("dash") : setStaffView("dash");
      await Promise.all([fetchWorkspace(), fetchNotifications()]);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleSignup = async () => {
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      setAppError("Enter your name, email address and password.");
      return;
    }
    setAppError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? `Signup failed (${res.status})`);
      const user = data.user as AuthUser;
      setCurrentUser(user);
      setSelectedRole(user.role === "staff" ? "staff" : "admin");
      await Promise.all([fetchWorkspace(), fetchNotifications()]);
      setIsLoggedIn(true);
      user.role !== "staff" ? setAdminView("dash") : setStaffView("dash");
    } catch (err) {
      console.error(err);
      setAppError("Account creation failed. Please try again.");
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!loginEmail.trim()) {
      setAppError("Enter your email address.");
      return;
    }
    setAppError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAppError(data.error ?? "Password reset request failed");
      return;
    }
    setResetCodeSent(true);
    setResetMessage(data.message);
  };

  const handleResetPassword = async () => {
    setAppError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail.trim(),
        code: resetCode,
        password: resetPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAppError(data.error ?? "Password reset failed");
      return;
    }
    setIsResetMode(false);
    setResetCodeSent(false);
    setResetCode("");
    setResetPassword("");
    setResetMessage("");
    setAppError("");
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
          team: currentUserName ? [currentUserName] : [],
        }),
      });
      if (res.ok) {
        setNpName("");
        setNpDesc("");
        setNpStart("");
        setNpEnd("");
        await fetchWorkspace();
        setAdminView("allproj");
      } else {
        throw new Error(`Project creation failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setAppError("Project creation failed. Please try again.");
    }
  };

  const handleAddTask = async () => {
    if (!ntName || !ntAssignee) {
      setAppError("Select a team member for this task.");
      return;
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectKey,
          name: ntName,
          assigneeId: Number(ntAssignee),
          priority: ntPriority,
        }),
      });
      if (res.ok) {
        setNtName("");
        setNtAssignee("");
        setIsAddTaskOpen(false);
        await fetchWorkspace();
      } else {
        throw new Error(`Task creation failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setAppError("Task creation failed. Please try again.");
    }
  };

  const handleToggleTaskStatus = async (
    taskId: string,
    currentStatus: string,
  ) => {
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
      } else {
        throw new Error(`Task update failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setAppError("Task update failed. Please try again.");
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject?.name.trim()) return;
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProject),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Project update failed");
      setEditingProject(null);
      await fetchWorkspace();
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "Project update failed");
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (
      !window.confirm(
        `Delete "${project.name}" and all of its tasks? This cannot be undone.`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Project deletion failed");
      await fetchWorkspace();
      setAdminView("allproj");
    } catch (err) {
      setAppError(
        err instanceof Error ? err.message : "Project deletion failed",
      );
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask?.name.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTask),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Task update failed");
      setEditingTask(null);
      await fetchWorkspace();
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "Task update failed");
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.name}"? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Task deletion failed");
      await fetchWorkspace();
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "Task deletion failed");
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) return;
    try {
      const userName = inviteEmail.split("@")[0].replace(".", " ");
      const formattedName =
        userName.charAt(0).toUpperCase() + userName.slice(1);
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName,
          email: inviteEmail,
          role: inviteRole || "Frontend Developer",
          department: "Engineering",
          projectId: inviteProjId || undefined,
          systemRole:
            adminView === "teamadmin" && currentUser?.role === "super_admin"
              ? "admin"
              : "staff",
        }),
      });
      if (res.ok) {
        setInviteEmail("");
        setInviteRole("");
        setIsInviteModalOpen(false);
        await fetchWorkspace();
      } else {
        throw new Error(`Invitation failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setAppError("The invitation could not be sent. Please try again.");
    }
  };

  const handleSendChatMessage = async () => {
    if (!newMessageText.trim()) return;
    const senderName = currentUser?.name ?? "Member";
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
      } else {
        throw new Error(`Message send failed (${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setAppError("The message could not be sent. Please try again.");
    }
  };

  const unreadChatCount = (type: "proj" | "dm", targetId: string) =>
    notifications.filter(
      (notification) =>
        !notification.isRead &&
        notification.type === "message_received" &&
        (type === "proj"
          ? String(notification.relatedProjectId) === targetId
          : String(notification.actorId) === targetId),
    ).length;

  const latestChatMessage = (type: "proj" | "dm", targetId: string) => {
    const conversation = chats.filter(
      (message) => message.type === type && message.targetId === targetId,
    );
    return conversation[conversation.length - 1];
  };

  const latestDirectMessageIndex = (targetId: string) =>
    chats.reduce(
      (latestIndex, message, index) =>
        message.type === "dm" && message.targetId === targetId
          ? index
          : latestIndex,
      -1,
    );

  const chatContacts = contacts
    .filter((member) => member.name !== currentUser?.name)
    .sort((left, right) => {
      const unreadDifference =
        unreadChatCount("dm", right.id) - unreadChatCount("dm", left.id);
      if (unreadDifference !== 0) return unreadDifference;
      const leftIndex = latestDirectMessageIndex(left.id);
      const rightIndex = latestDirectMessageIndex(right.id);
      return rightIndex - leftIndex;
    });

  const handleOpenConversation = async (
    type: "proj" | "dm",
    targetId: string,
  ) => {
    setChatType(type);
    setChatTarget(targetId);
    if (unreadChatCount(type, targetId) === 0) {
      await fetchWorkspace();
      return;
    }
    await Promise.all([
      fetch("/api/notifications/read-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId }),
      }),
      fetchWorkspace(),
    ]);
    await fetchNotifications();
  };

  useEffect(() => {
    const directChatOpen =
      (selectedRole === "admin" && adminView === "chatcontacts") ||
      (selectedRole === "staff" && staffView === "chatcontacts");
    const projectChatOpen =
      (selectedRole === "admin" && adminView === "chatprojects") ||
      (selectedRole === "staff" && staffView === "chatprojects");

    if (directChatOpen) {
      if (
        !chatContacts.some((member) => member.id === chatTarget) &&
        chatContacts[0]
      ) {
        void handleOpenConversation("dm", chatContacts[0].id);
      }
    } else if (
      projectChatOpen &&
      !projects.some((project) => project.id === chatTarget) &&
      projects[0]
    ) {
      void handleOpenConversation("proj", projects[0].id);
    }
  }, [adminView, staffView, selectedRole, contacts, projects]);

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
      "Preparing summary response...",
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
        setAiMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: "I ran into a server error. Please verify the Gemini API Key configuration.",
          },
        ]);
      }
    } catch (err) {
      clearInterval(timer);
      setAiMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Network connection failed. Please try again." },
      ]);
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
  const inProgressTasks = tasks.filter(
    (t) => t.status === "In Progress",
  ).length;
  const notStartedTasks = tasks.filter(
    (t) => t.status === "Not Started",
  ).length;
  const completedTasksPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const inProgressTasksPercent =
    totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;

  // Filter tasks based on category in admin tasks view
  const filteredTasksForCategory = tasks.filter(
    (t) =>
      t.status === activeTaskCategory &&
      (tasksFilterProject === "all" || t.projectId === tasksFilterProject),
  );
  // Active project detail object
  const activeProject =
    projects.find((p) => p.id === activeProjectKey) || projects[0];

  // Chats target messages list
  const currentChatMessages = chats.filter(
    (c) => c.type === chatType && c.targetId === chatTarget,
  );

  // Staff tasks computations
  const currentUserName = currentUser?.name ?? "";
  const currentUserInitials = currentUserName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const staffTasksList = tasks.filter(
    (task) => task.assignedTo === currentUserName,
  );
  const staffCompletedTasksCount = staffTasksList.filter(
    (t) => t.status === "Completed",
  ).length;
  const staffTasksProgressPercent =
    staffTasksList.length > 0
      ? Math.round((staffCompletedTasksCount / staffTasksList.length) * 100)
      : 0;

  // Chronologically filter/sort staff tasks
  const getFilteredStaffTasks = () => {
    let list = [...staffTasksList];
    if (staffFilter === "done") {
      list = list.filter((t) => t.status === "Completed");
    } else if (staffFilter === "notdone") {
      list = list.filter((t) => t.status !== "Completed");
    }
    return list.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  };

  // Dynamic direction
  const isRtl = lang === "ar";
  const directionClass = isRtl ? "rtl" : "ltr";
  const viewLabels: Record<string, string> = {
    dash: "Dashboard",
    "dash-projects": "Projects",
    "dash-tasks": "Tasks",
    allproj: "All Projects",
    newproj: "New Project",
    projectdetail: "Project Details",
    projects: "Projects",
    tasks: "Tasks",
    chatprojects: "Team Projects",
    chatcontacts: "Direct Contacts",
    teamadmin: "Administrators",
    teammembers: "Team Members",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5F9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading OpsFlow Workspace...
          </p>
        </div>
      </div>
    );
  }

  // LOGIN / SIGNUP SCREEN
  if (!isLoggedIn) {
    return (
      <div
        className="min-h-screen bg-[#F3F5F9] flex items-center justify-center p-4 relative"
        dir={directionClass}
      >
        <button
          type="button"
          aria-label={
            lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"
          }
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
            {isResetMode
              ? t("Reset Password")
              : isSignupMode
                ? t("Sign Up")
                : t("Log In")}
          </h2>
          <p className="text-sm text-center text-gray-500 mb-6">
            {isResetMode
              ? resetCodeSent
                ? t("Use the code sent to your email")
                : t("Enter your email to receive a reset code")
              : isSignupMode
                ? t("Create an administrator account")
                : t("Enter your credentials to access the operations hub")}
          </p>
          {appError && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
            >
              {appError}
            </div>
          )}

          {isResetMode ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void (resetCodeSent
                  ? handleResetPassword()
                  : handleRequestPasswordReset());
              }}
            >
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                  {t("Email")}
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={t("Enter your email")}
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>
              {resetCodeSent && (
                <>
                  {resetMessage && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                      {resetMessage}
                    </div>
                  )}
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={resetCode}
                    onChange={(event) =>
                      setResetCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder={t("Six-digit code")}
                    className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder={t("New password")}
                    className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                </>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
              >
                {resetCodeSent ? t("Reset Password") : t("Send Reset Code")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setResetCodeSent(false);
                  setAppError("");
                }}
                className="w-full text-xs text-gray-500 hover:text-gray-900"
              >
                {t("Back to login")}
              </button>
            </form>
          ) : !isSignupMode ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                  {t("Email")}
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={t("Enter your email")}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                  {t("Password")}
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t("Enter your password")}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setAppError("");
                    setIsResetMode(true);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {t("Forgot password?")}
                </button>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{t("Log In")}</span>
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsSignupMode(true)}
                  className="text-xs text-gray-500 hover:text-gray-900"
                >
                  {t("Need an account?")}{" "}
                  <span className="font-bold text-blue-600 hover:underline">
                    {t("Register now")}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder={t("Enter full name")}
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                  {t("Email")}
                </label>
                <input
                  type="email"
                  placeholder="email@opsflow.io"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAFBFD] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                  {t("Password")}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("Create a password")}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
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
                  {t("Already have an account?")}{" "}
                  <span className="font-bold text-blue-600 hover:underline">
                    {t("Log In")}
                  </span>
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
    <div
      className={`min-h-screen bg-[#F3F5F9] flex text-gray-800 ${isRtl ? "font-sans" : "font-sans"}`}
      dir={directionClass}
    >
      {appError && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 z-[200] flex max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-xs text-red-700 shadow-lg"
        >
          <span>{appError}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setAppError("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-[260px] bg-[#0E1526] text-white flex flex-col flex-shrink-0 relative overflow-y-auto">
        {/* Brand Banner */}
        <div className="p-6 border-b border-gray-800/60 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-blue-700 text-white rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight">OpsFlow</h1>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              {t("Operations Hub")}
            </p>
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
                  adminView === "dash" ||
                  adminView === "dash-projects" ||
                  adminView === "teammembers" ||
                  adminView === "dash-tasks"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4.5 h-4.5" />
                  <span>{t("Dashboard")}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${menuOpen.dash ? "rotate-90" : ""}`}
                />
              </button>

              {menuOpen.dash && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => setAdminView("dash")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "dash"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setAdminView("dash-projects")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "dash-projects"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Total Projects
                  </button>
                  <button
                    onClick={() => setAdminView("teammembers")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "teammembers"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {t("Team Members")}
                  </button>
                  <button
                    onClick={() => setAdminView("dash-tasks")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "dash-tasks"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
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
                  adminView === "allproj" ||
                  adminView === "newproj" ||
                  adminView === "projectdetail"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-4.5 h-4.5" />
                  <span>{t("Projects")}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${menuOpen.proj ? "rotate-90" : ""}`}
                />
              </button>

              {menuOpen.proj && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => setAdminView("newproj")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "newproj"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    New Project
                  </button>
                  <button
                    onClick={() => setAdminView("allproj")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "allproj"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {t("All Projects")}
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
                  adminView === "tasks"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4.5 h-4.5" />
                  <span>{t("Tasks")}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${menuOpen.tasks ? "rotate-90" : ""}`}
                />
              </button>

              {menuOpen.tasks && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTaskCategory("Completed");
                      setAdminView("tasks");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "tasks" &&
                      activeTaskCategory === "Completed"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
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
                      adminView === "tasks" &&
                      activeTaskCategory === "In Progress"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
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
                      adminView === "tasks" &&
                      activeTaskCategory === "Not Started"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
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
                  <span>{t("Chat")}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${menuOpen.chat ? "rotate-90" : ""}`}
                />
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
                      adminView === "chatprojects"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {t("Team Projects")}
                  </button>
                  <button
                    onClick={() => {
                      setChatType("dm");
                      setChatTarget("sara");
                      setAdminView("chatcontacts");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "chatcontacts"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {t("Direct Contacts")}
                  </button>
                </div>
              )}
            </div>

            {/* Team Navigation */}
            <div>
              <button
                onClick={() => {
                  toggleSubmenu("team");
                  setAdminView(
                    currentUser?.role === "super_admin"
                      ? "teamadmin"
                      : "teammembers",
                  );
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                  adminView === "teamadmin" || adminView === "teammembers"
                    ? "bg-[#1A2338] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4.5 h-4.5" />
                  <span>{t("Team")}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${menuOpen.team ? "rotate-90" : ""}`}
                />
              </button>

              {menuOpen.team && (
                <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                  {currentUser?.role !== "staff" && (
                    <button
                      onClick={() => setAdminView("teamadmin")}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                        adminView === "teamadmin"
                          ? "text-blue-400"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {t("Admin List")}
                    </button>
                  )}
                  <button
                    onClick={() => setAdminView("teammembers")}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      adminView === "teammembers"
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {t("Team Members")}
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
                staffView === "dash"
                  ? "bg-[#1A2338] text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/35"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>{t("Dashboard")}</span>
            </button>

            <button
              onClick={() => setStaffView("projects")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                staffView === "projects"
                  ? "bg-[#1A2338] text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/35"
              }`}
            >
              <Folder className="w-4.5 h-4.5" />
              <span>{t("Projects")}</span>
            </button>

            <button
              onClick={() => setStaffView("tasks")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                staffView === "tasks"
                  ? "bg-[#1A2338] text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/35"
              }`}
            >
              <CheckSquare className="w-4.5 h-4.5" />
              <span>{t("Tasks")}</span>
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
                  <span>{t("Chat")}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${menuOpen.chat ? "rotate-90" : ""}`}
                />
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
                      staffView === "chatprojects"
                        ? "text-blue-400"
                        : "text-gray-400"
                    }`}
                  >
                    {t("Team Projects")}
                  </button>
                  <button
                    onClick={() => {
                      setChatType("dm");
                      setChatTarget("omar");
                      setStaffView("chatcontacts");
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold ${
                      staffView === "chatcontacts"
                        ? "text-blue-400"
                        : "text-gray-400"
                    }`}
                  >
                    {t("Direct Contacts")}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setStaffView("teammembers")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                staffView === "teammembers"
                  ? "bg-[#1A2338] text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/35"
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>{t("Team Members")}</span>
            </button>
          </nav>
        )}

        {/* Profile / Logout section */}
        <div className="p-4 border-t border-gray-800/60 mt-auto">
          <div className="flex items-center gap-3 p-2 bg-[#1A2338] rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xs">
              {currentUserInitials || "U"}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold truncate">{currentUserName}</h4>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">
                {currentUser?.role === "super_admin"
                  ? t("Super Admin")
                  : currentUser?.role === "admin"
                    ? t("Administrator")
                    : t("Staff")}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              setCurrentUser(null);
              setIsLoggedIn(false);
              setLoginPassword("");
            }}
            className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("Log Out")}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen relative overflow-y-auto">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-gray-100 px-8 flex items-center justify-between flex-shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <span>
              {selectedRole === "admin" ? t("Dashboard") : t("Staff Portal")}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <b className="text-gray-900 font-bold capitalize">
              {t(
                viewLabels[selectedRole === "admin" ? adminView : staffView] ??
                  "Dashboard",
              )}
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

            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((open) => !open)}
                aria-label={t("Notifications")}
                className="relative p-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-100 transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">
                      {t("Notifications")}
                    </h3>
                    {unreadNotificationCount > 0 && (
                      <button
                        onClick={async () => {
                          await fetch("/api/notifications/read-all", {
                            method: "POST",
                          });
                          await fetchNotifications();
                        }}
                        className="text-[10px] font-bold text-blue-600"
                      >
                        {t("Mark all as read")}
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs text-gray-400">
                        {t("No notifications")}
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={async () => {
                            if (!notification.isRead) {
                              await fetch(
                                `/api/notifications/${notification.id}/read`,
                                { method: "PATCH" },
                              );
                              await fetchNotifications();
                            }
                          }}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${notification.isRead ? "bg-white" : "bg-blue-50/60"}`}
                        >
                          <p className="text-xs font-bold text-gray-900">
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-[9px] text-gray-400 mt-1.5">
                            {new Date(notification.createdAt).toLocaleString(
                              lang === "ar" ? "ar-SA" : "en-US",
                            )}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
              {currentUserInitials || "U"}
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
                          <span className="absolute top-4 right-4 text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                            +1 this month
                          </span>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {t("Total Projects")}
                          </p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">
                            {totalProjects}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Active pipelines
                          </p>
                        </div>

                        <div
                          onClick={() => setAdminView("teammembers")}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
                        >
                          <span className="absolute top-4 right-4 text-xs font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                            +2 onboarding
                          </span>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {t("Team Members")}
                          </p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">
                            {members.length}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Direct operators
                          </p>
                        </div>

                        <div
                          onClick={() => {
                            setActiveTaskCategory("Completed");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all relative"
                        >
                          <span className="absolute top-4 right-4 text-xs font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                            {completedTasksPercent}% done
                          </span>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Completed Tasks
                          </p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">
                            {completedTasks}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Sprint completion
                          </p>
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
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            In Progress
                          </p>
                          <h3 className="text-3xl font-extrabold text-gray-900 mt-2">
                            {inProgressTasks}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Awaiting dispatch
                          </p>
                        </div>
                      </div>

                      {/* Main visual layouts */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Interactive Task Distribution card */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4">
                          <h3 className="text-base font-extrabold text-gray-900">
                            {t("Task Distribution")}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Click a section to inspect tasks
                          </p>

                          <div className="my-8 flex justify-center">
                            {/* SVG Donut representation */}
                            <div className="relative w-36 h-36">
                              <svg
                                className="w-full h-full transform -rotate-90"
                                viewBox="0 0 36 36"
                              >
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="#E2E8F0"
                                  strokeWidth="3"
                                />
                                {/* Completed section (green) */}
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="#22C55E"
                                  strokeWidth="3.5"
                                  strokeDasharray={`${completedTasksPercent} ${100 - completedTasksPercent}`}
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
                                  strokeDasharray={`${inProgressTasksPercent} ${100 - inProgressTasksPercent}`}
                                  strokeDashoffset={`-${completedTasksPercent}`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-gray-900">
                                  {totalTasks}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">
                                  Tasks
                                </span>
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
                                <span className="text-xs font-bold text-gray-700">
                                  {t("Completed")}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">
                                {completedTasks}
                              </span>
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
                                <span className="text-xs font-bold text-gray-700">
                                  {t("In Progress")}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">
                                {inProgressTasks}
                              </span>
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
                                <span className="text-xs font-bold text-gray-700">
                                  {t("Not Started")}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">
                                {notStartedTasks}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Active Projects List */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-8">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-extrabold text-gray-900">
                              {t("Active Projects")}
                            </h3>
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
                                  <span
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: proj.color }}
                                  ></span>
                                  <div className="min-w-0">
                                    <h4 className="font-extrabold text-sm text-gray-900 truncate">
                                      {proj.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate max-w-sm">
                                      {proj.description}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="text-right">
                                    <span className="text-xs font-extrabold text-gray-800">
                                      {proj.progress}%
                                    </span>
                                    <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${proj.progress}%`,
                                          backgroundColor: proj.color,
                                        }}
                                      ></div>
                                    </div>
                                  </div>

                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      proj.status === "In Progress"
                                        ? "bg-blue-50 text-blue-600"
                                        : proj.status === "Review"
                                          ? "bg-purple-50 text-purple-600"
                                          : proj.status === "Completed"
                                            ? "bg-green-50 text-green-600"
                                            : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
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
                        <h2 className="text-xl font-bold text-gray-900">
                          {t("Total Projects")}
                        </h2>
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
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            In Progress
                          </p>
                          <h3 className="text-2xl font-black text-blue-600 mt-1">
                            {
                              projects.filter((p) => p.status === "In Progress")
                                .length
                            }
                          </h3>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Review Stage
                          </p>
                          <h3 className="text-2xl font-black text-purple-600 mt-1">
                            {
                              projects.filter((p) => p.status === "Review")
                                .length
                            }
                          </h3>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Planning Stage
                          </p>
                          <h3 className="text-2xl font-black text-gray-500 mt-1">
                            {
                              projects.filter((p) => p.status === "Planning")
                                .length
                            }
                          </h3>
                        </div>
                      </div>

                      {/* Projects Table Grid */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50">
                          <h3 className="font-extrabold text-sm text-gray-900">
                            Project Master List
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50/55 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <th className="p-4 pl-6">
                                  {t("Project Name")}
                                </th>
                                <th className="p-4">{t("Status")}</th>
                                <th className="p-4">{t("Timeline")}</th>
                                <th className="p-4">{t("Progress")}</th>
                                <th className="p-4">{t("Allocated Staff")}</th>
                                <th className="p-4 text-center">
                                  {t("Actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {projects.map((proj) => (
                                <Fragment key={proj.id}>
                                  <tr
                                    key={proj.id}
                                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-all text-xs"
                                  >
                                    <td className="p-4 pl-6 font-bold text-gray-900 min-w-[200px]">
                                      <div className="flex items-center gap-2">
                                        {selectedRole === "admin" && (
                                          <button
                                            aria-label={`${expandedProjects.has(proj.id) ? "Collapse" : "Expand"} ${proj.name}`}
                                            onClick={() =>
                                              setExpandedProjects((current) => {
                                                const next = new Set(current);
                                                next.has(proj.id)
                                                  ? next.delete(proj.id)
                                                  : next.add(proj.id);
                                                return next;
                                              })
                                            }
                                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                          >
                                            <ChevronRight
                                              className={`w-3.5 h-3.5 transition-transform ${expandedProjects.has(proj.id) ? "rotate-90" : ""}`}
                                            />
                                          </button>
                                        )}
                                        <span
                                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                          style={{
                                            backgroundColor: proj.color,
                                          }}
                                        ></span>
                                        <span>{proj.name}</span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          proj.status === "In Progress"
                                            ? "bg-blue-50 text-blue-600"
                                            : "bg-purple-50 text-purple-600"
                                        }`}
                                      >
                                        {proj.status}
                                      </span>
                                    </td>
                                    <td className="p-4 text-gray-500">
                                      {proj.startDate} - {proj.endDate}
                                      <div
                                        className={`text-[10px] font-semibold mt-1 ${getDaysRemaining(proj.endDate).isOverdue ? "text-red-500" : "text-gray-400"}`}
                                      >
                                        {getDaysRemaining(proj.endDate).text}
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold">
                                          {proj.progress}%
                                        </span>
                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                          <div
                                            className="h-full rounded-full"
                                            style={{
                                              width: `${proj.progress}%`,
                                              backgroundColor: proj.color,
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex -space-x-1 overflow-hidden">
                                        {(proj.participants ?? [])
                                          .filter(
                                            (participant) =>
                                              !participant.isOwner &&
                                              participant.systemRole ===
                                                "staff",
                                          )
                                          .map((participant) => (
                                            <div
                                              key={participant.id}
                                              title={participant.name}
                                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-blue-600 text-white font-black text-[9px] flex items-center justify-center"
                                            >
                                              {participant.name
                                                .split(" ")
                                                .map((word) => word[0])
                                                .join("")}
                                            </div>
                                          ))}
                                      </div>
                                    </td>
                                    <td className="p-4 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          onClick={() => {
                                            setActiveProjectKey(proj.id);
                                            setAdminView("projectdetail");
                                          }}
                                          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-bold text-[10px] transition-all"
                                        >
                                          {t("Manage")}
                                        </button>
                                        <button
                                          aria-label={`Edit ${proj.name}`}
                                          onClick={() =>
                                            setEditingProject({ ...proj })
                                          }
                                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          aria-label={`Delete ${proj.name}`}
                                          onClick={() =>
                                            handleDeleteProject(proj)
                                          }
                                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {selectedRole === "admin" &&
                                    expandedProjects.has(proj.id) && (
                                      <tr className="border-b border-gray-100 bg-slate-50/80">
                                        <td colSpan={6} className="px-8 py-5">
                                          <div
                                            className={`grid gap-5 ${currentUser?.role === "super_admin" ? "md:grid-cols-2" : ""}`}
                                          >
                                            {currentUser?.role ===
                                              "super_admin" && (
                                              <div>
                                                <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-purple-600">
                                                  {t("Project Admin")}
                                                </h4>
                                                <div className="space-y-2">
                                                  {(proj.participants ?? [])
                                                    .filter(
                                                      (participant) =>
                                                        participant.isOwner ||
                                                        (participant.projectRole ===
                                                          "manager" &&
                                                          participant.systemRole !==
                                                            "staff"),
                                                    )
                                                    .map((participant) => (
                                                      <div
                                                        key={participant.id}
                                                        className="flex items-center gap-3 rounded-xl border border-purple-100 bg-white p-3"
                                                      >
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-[10px] font-black text-purple-700">
                                                          {participant.name
                                                            .split(/\s+/)
                                                            .map(
                                                              (part) => part[0],
                                                            )
                                                            .join("")
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                        </div>
                                                        <div>
                                                          <p className="text-xs font-bold text-gray-900">
                                                            {participant.name}
                                                          </p>
                                                          <p className="text-[10px] text-gray-400">
                                                            {participant.email}{" "}
                                                            ·{" "}
                                                            {participant.isOwner
                                                              ? t("Owner")
                                                              : t("Manager")}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    ))}
                                                </div>
                                              </div>
                                            )}
                                            <div>
                                              <h4 className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                                                {t("Team Members")}
                                              </h4>
                                              <div className="grid gap-2 sm:grid-cols-2">
                                                {(
                                                  proj.participants ?? []
                                                ).filter(
                                                  (participant) =>
                                                    !participant.isOwner &&
                                                    !(
                                                      participant.projectRole ===
                                                        "manager" &&
                                                      participant.systemRole !==
                                                        "staff"
                                                    ),
                                                ).length === 0 ? (
                                                  <p className="text-xs text-gray-400">
                                                    {t("No team members")}
                                                  </p>
                                                ) : (
                                                  (proj.participants ?? [])
                                                    .filter(
                                                      (participant) =>
                                                        !participant.isOwner &&
                                                        !(
                                                          participant.projectRole ===
                                                            "manager" &&
                                                          participant.systemRole !==
                                                            "staff"
                                                        ),
                                                    )
                                                    .map((participant) => (
                                                      <div
                                                        key={participant.id}
                                                        className="rounded-xl border border-gray-100 bg-white p-3"
                                                      >
                                                        <p className="text-xs font-bold text-gray-900">
                                                          {participant.name}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                                          {participant.email} ·{" "}
                                                          {
                                                            participant.projectRole
                                                          }
                                                        </p>
                                                      </div>
                                                    ))
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                </Fragment>
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
                          <h2 className="text-xl font-bold text-gray-900">
                            {t("All Projects")}
                          </h2>
                          <p className="text-xs text-gray-500">
                            Track and dispatch active operational tasks
                          </p>
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
                              <span
                                className="w-4.5 h-4.5 rounded-lg flex items-center justify-center font-bold text-xs"
                                style={{
                                  backgroundColor: `${proj.color}20`,
                                  color: proj.color,
                                }}
                              >
                                📁
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  proj.status === "In Progress"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-purple-50 text-purple-600"
                                }`}
                              >
                                {proj.status}
                              </span>
                            </div>

                            <h3 className="font-extrabold text-sm text-gray-900 mb-1">
                              {proj.name}
                            </h3>
                            <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-grow">
                              {proj.description}
                            </p>

                            <div className="space-y-3 mt-auto">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{t("Progress")}</span>
                                <span className="font-bold text-gray-900">
                                  {proj.progress}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${proj.progress}%`,
                                    backgroundColor: proj.color,
                                  }}
                                ></div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                                <span className="text-gray-400 font-semibold">
                                  {proj.startDate} – {proj.endDate}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setEditingProject({ ...proj })
                                    }
                                    className="font-bold text-blue-600"
                                  >
                                    {t("Edit")}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProject(proj)}
                                    className="font-bold text-red-600"
                                  >
                                    {t("Delete")}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveProjectKey(proj.id);
                                      setAdminView("projectdetail");
                                    }}
                                    className="font-bold text-gray-700 hover:underline"
                                  >
                                    {t("Manage")}
                                  </button>
                                </div>
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
                        <span>{t("Back to Projects")}</span>
                      </button>

                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-50 gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span
                                className="w-3.5 h-3.5 rounded-full"
                                style={{ backgroundColor: activeProject.color }}
                              ></span>
                              <h2 className="text-xl font-bold text-gray-900">
                                {activeProject.name}
                              </h2>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                              {activeProject.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs font-bold text-gray-500">
                                Completion
                              </span>
                              <h4 className="text-lg font-black text-gray-900 mt-0.5">
                                {activeProject.progress}%
                              </h4>
                            </div>
                            <div className="w-20 h-20 relative">
                              {/* SVG Donut */}
                              <svg
                                className="w-full h-full transform -rotate-90"
                                viewBox="0 0 36 36"
                              >
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="#F1F5F9"
                                  strokeWidth="4"
                                />
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
                              <h3 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">
                                Project Team
                              </h3>
                              <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t("Add Member")}</span>
                              </button>
                            </div>

                            <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                              {activeProject.team.map((name, idx) => {
                                const matchedMember = members.find(
                                  (m) => m.name === name,
                                );
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 text-xs shadow-sm"
                                  >
                                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center">
                                      {name
                                        .split(" ")
                                        .map((word) => word[0])
                                        .join("")}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-900">
                                        {name}
                                      </h4>
                                      <p className="text-[10px] text-gray-400 font-semibold">
                                        {matchedMember?.role || "Staff Member"}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Project Tasks */}
                          <div className="lg:col-span-8 space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">
                                Tasks Pipeline
                              </h3>
                              <button
                                onClick={() => setIsAddTaskOpen(true)}
                                className="px-3 py-1.5 bg-[#0E1526] hover:bg-gray-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t("Create Task")}</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {tasks.filter(
                                (t) => t.projectId === activeProject.id,
                              ).length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                  No tasks allocated to this project yet. Click
                                  Create Task above.
                                </p>
                              ) : (
                                tasks
                                  .filter(
                                    (t) => t.projectId === activeProject.id,
                                  )
                                  .map((task) => (
                                    <div
                                      key={task.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100/60 rounded-xl border border-gray-100 transition-all text-xs"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <button
                                          onClick={() =>
                                            handleToggleTaskStatus(
                                              task.id,
                                              task.status,
                                            )
                                          }
                                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                            task.status === "Completed"
                                              ? "bg-green-500 border-green-500 text-white"
                                              : task.status === "In Progress"
                                                ? "border-blue-500 text-blue-500"
                                                : "border-gray-300"
                                          }`}
                                        >
                                          {task.status === "Completed" && (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          )}
                                          {task.status === "In Progress" && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                          )}
                                        </button>

                                        <div className="min-w-0">
                                          <h4
                                            className={`font-bold text-gray-900 truncate ${task.status === "Completed" ? "line-through text-gray-400 font-normal" : ""}`}
                                          >
                                            {task.name}
                                          </h4>
                                          <p className="text-[10px] text-gray-400 font-medium">
                                            {task.assignedTo}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 flex-shrink-0">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                            task.priority === "High"
                                              ? "bg-red-50 text-red-600"
                                              : task.priority === "Medium"
                                                ? "bg-orange-50 text-orange-600"
                                                : "bg-green-50 text-green-600"
                                          }`}
                                        >
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
                        <h2 className="text-xl font-bold text-gray-900">
                          {t("New Project")}
                        </h2>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-2xl">
                        <h3 className="font-extrabold text-sm text-gray-900 mb-4">
                          {t("Project Details")}
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                              {t("Project Name")}
                            </label>
                            <input
                              type="text"
                              value={npName}
                              onChange={(e) => setNpName(e.target.value)}
                              placeholder="e.g. E-Commerce Redesign"
                              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                              {t("Description")}
                            </label>
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
                              <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                                {t("Start Date")}
                              </label>
                              <input
                                type="date"
                                value={npStart}
                                onChange={(e) => setNpStart(e.target.value)}
                                placeholder="Jun 1"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 uppercase mb-1 tracking-wider">
                                {t("End Date")}
                              </label>
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
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-2 tracking-wider">
                              {t("Color Label")}
                            </label>
                            <div className="flex gap-2.5">
                              {[
                                "#3B82F6",
                                "#22C55E",
                                "#8B5CF6",
                                "#F59E0B",
                                "#EF4444",
                                "#06B6D4",
                                "#EC4899",
                              ].map((col) => (
                                <button
                                  key={col}
                                  onClick={() => setNpColor(col)}
                                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                                    npColor === col
                                      ? "border-gray-800 scale-110 shadow-sm"
                                      : "border-transparent"
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
                              onClick={handleCreateProject}
                              className="flex-grow py-2.5 font-bold text-xs rounded-xl shadow-sm transition-colors bg-[#0E1526] hover:bg-gray-800 text-white"
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
                      <h2 className="text-xl font-bold text-gray-900">
                        {t("Total Tasks")}
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div
                          onClick={() => {
                            setActiveTaskCategory("Completed");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center cursor-pointer hover:shadow-md transition-all"
                        >
                          <span className="text-green-500 font-extrabold text-xs">
                            Completed
                          </span>
                          <h3 className="text-3xl font-black text-green-600 mt-2">
                            {completedTasks}
                          </h3>
                        </div>

                        <div
                          onClick={() => {
                            setActiveTaskCategory("In Progress");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center cursor-pointer hover:shadow-md transition-all"
                        >
                          <span className="text-blue-500 font-extrabold text-xs">
                            In Progress
                          </span>
                          <h3 className="text-3xl font-black text-blue-600 mt-2">
                            {inProgressTasks}
                          </h3>
                        </div>

                        <div
                          onClick={() => {
                            setActiveTaskCategory("Not Started");
                            setAdminView("tasks");
                          }}
                          className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center cursor-pointer hover:shadow-md transition-all"
                        >
                          <span className="text-gray-400 font-extrabold text-xs">
                            Not Started
                          </span>
                          <h3 className="text-3xl font-black text-gray-500 mt-2">
                            {notStartedTasks}
                          </h3>
                        </div>
                      </div>

                      {/* Complete List of Sprint Tasks */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="font-extrabold text-sm text-gray-900 mb-4">
                          Complete Task Catalog ({totalTasks})
                        </h3>
                        <div className="space-y-3">
                          {tasks.map((task) => {
                            const matchedProj = projects.find(
                              (p) => p.id === task.projectId,
                            );
                            return (
                              <div
                                key={task.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/60 rounded-xl border border-gray-100 transition-all text-xs gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <button
                                    onClick={() =>
                                      handleToggleTaskStatus(
                                        task.id,
                                        task.status,
                                      )
                                    }
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                      task.status === "Completed"
                                        ? "bg-green-500 border-green-500 text-white"
                                        : task.status === "In Progress"
                                          ? "border-blue-500 text-blue-500"
                                          : "border-gray-300"
                                    }`}
                                  >
                                    {task.status === "Completed" && (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    {task.status === "In Progress" && (
                                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    )}
                                  </button>

                                  <div className="min-w-0">
                                    <h4
                                      className={`font-bold text-gray-900 truncate ${task.status === "Completed" ? "line-through text-gray-400 font-normal" : ""}`}
                                    >
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
                                    <p className="font-bold text-gray-800">
                                      {task.assignedTo}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                      Sprint Allocation
                                    </p>
                                  </div>

                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                                      task.priority === "High"
                                        ? "bg-red-50 text-red-600"
                                        : task.priority === "Medium"
                                          ? "bg-orange-50 text-orange-600"
                                          : "bg-green-50 text-green-600"
                                    }`}
                                  >
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
                          <h2 className="text-xl font-bold text-gray-900 capitalize">
                            Tasks: {t(activeTaskCategory)}
                          </h2>
                          <p className="text-xs text-gray-500">
                            Dispatch and verify pipeline completions
                          </p>
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
                        <span
                          className={`px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600`}
                        >
                          {filteredTasksForCategory.length} tasks cataloged
                        </span>
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="space-y-3">
                          {filteredTasksForCategory.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-10">
                              No tasks currently fit this category.
                            </p>
                          ) : (
                            filteredTasksForCategory.map((task) => {
                              const matchedProj = projects.find(
                                (p) => p.id === task.projectId,
                              );
                              return (
                                <div
                                  key={task.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/60 rounded-xl border border-gray-100 transition-all text-xs gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <button
                                      onClick={() =>
                                        handleToggleTaskStatus(
                                          task.id,
                                          task.status,
                                        )
                                      }
                                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-blue-500 text-blue-500 transition-all flex-shrink-0"
                                    >
                                      {task.status === "Completed" ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                      ) : (
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                      )}
                                    </button>
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-gray-900 truncate">
                                        {task.name}
                                      </h4>
                                      <span
                                        className="text-[9px] font-semibold uppercase tracking-wider block mt-0.5"
                                        style={{ color: matchedProj?.color }}
                                      >
                                        {matchedProj?.name}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    <span className="font-bold text-gray-800">
                                      {task.assignedTo}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                        task.priority === "High"
                                          ? "bg-red-50 text-red-600"
                                          : "bg-orange-50 text-orange-600"
                                      }`}
                                    >
                                      {task.priority}
                                    </span>
                                    <button
                                      aria-label={`Edit ${task.name}`}
                                      onClick={() =>
                                        setEditingTask({ ...task })
                                      }
                                      className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      aria-label={`Delete ${task.name}`}
                                      onClick={() => handleDeleteTask(task)}
                                      className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
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
                  {(adminView === "chatprojects" ||
                    adminView === "chatcontacts") && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">
                          {adminView === "chatprojects"
                            ? t("Team Projects")
                            : t("Direct Contacts")}
                        </h2>
                        <span className="text-xs text-gray-500">
                          Real-time collaboration panel
                        </span>
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[560px]">
                        {/* Conversations list Left Sidebar */}
                        <div className="md:col-span-4 border-r border-gray-100 flex flex-col h-full bg-[#FAFBFD]">
                          <div className="p-4 border-b border-gray-100 bg-white">
                            <div className="relative bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-gray-400">
                              <Search className="w-3.5 h-3.5" />
                              <input
                                type="text"
                                placeholder={t("Search message rooms...")}
                                className="bg-transparent border-none text-xs w-full focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {adminView === "chatprojects"
                              ? // Project Groups list
                                projects.map((proj) => (
                                  <div
                                    key={proj.id}
                                    onClick={() =>
                                      handleOpenConversation("proj", proj.id)
                                    }
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                      chatType === "proj" &&
                                      chatTarget === proj.id
                                        ? "bg-blue-50"
                                        : "hover:bg-gray-100/60"
                                    }`}
                                  >
                                    <div
                                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-extrabold flex-shrink-0"
                                      style={{ backgroundColor: proj.color }}
                                    >
                                      💬
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex justify-between items-baseline">
                                        <h4 className="font-bold text-xs text-gray-900 truncate">
                                          {proj.name}
                                        </h4>
                                        {unreadChatCount("proj", proj.id) >
                                          0 && (
                                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            {unreadChatCount("proj", proj.id)}
                                          </span>
                                        )}
                                        {unreadChatCount("proj", proj.id) ===
                                          0 && (
                                          <span className="text-[9px] text-gray-400">
                                            {latestChatMessage("proj", proj.id)
                                              ?.timestamp ?? ""}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                        {latestChatMessage("proj", proj.id)
                                          ?.text ?? t("No messages yet")}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              : // DMs members list
                                chatContacts.map((m) => (
                                  <div
                                    key={m.id}
                                    onClick={() =>
                                      handleOpenConversation("dm", m.id)
                                    }
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                      chatType === "dm" && chatTarget === m.id
                                        ? "bg-blue-50"
                                        : "hover:bg-gray-100/60"
                                    }`}
                                  >
                                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center flex-shrink-0 relative">
                                      {m.name
                                        .split(" ")
                                        .map((w) => w[0])
                                        .join("")}
                                      <span
                                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                          m.status === "Active"
                                            ? "bg-green-500"
                                            : "bg-orange-500"
                                        }`}
                                      ></span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex justify-between items-baseline">
                                        <h4 className="font-bold text-xs text-gray-900 truncate">
                                          {m.name}
                                        </h4>
                                        {unreadChatCount("dm", m.id) > 0 && (
                                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            {unreadChatCount("dm", m.id)}
                                          </span>
                                        )}
                                        {unreadChatCount("dm", m.id) === 0 && (
                                          <span className="text-[9px] text-gray-400">
                                            {latestChatMessage("dm", m.id)
                                              ?.timestamp ?? ""}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                        {latestChatMessage("dm", m.id)?.text ??
                                          t("No messages yet")}
                                      </p>
                                    </div>
                                  </div>
                                ))}
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
                                  {chatType === "proj"
                                    ? projects.find((p) => p.id === chatTarget)
                                        ?.name
                                    : contacts.find((m) => m.id === chatTarget)
                                        ?.name}
                                </h4>
                                <p className="text-[10px] text-gray-400 font-medium">
                                  Real-time communication room
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Chat Messages flow */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {currentChatMessages.map((msg) => {
                              const isMe = msg.sender.name === currentUserName;
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex items-start gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                                >
                                  {!isMe && (
                                    <div
                                      className="w-7 h-7 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0"
                                      style={{
                                        backgroundColor: msg.sender.color,
                                      }}
                                    >
                                      {msg.sender.initials}
                                    </div>
                                  )}

                                  <div
                                    className={`space-y-1 ${isMe ? "text-right" : ""}`}
                                  >
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="text-[10px] font-bold text-gray-900">
                                        {msg.sender.name}
                                      </span>
                                      <span className="text-[9px] text-gray-400">
                                        {msg.timestamp}
                                      </span>
                                    </div>
                                    <div
                                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                        isMe
                                          ? "bg-blue-600 text-white rounded-tr-none"
                                          : "bg-gray-100 text-gray-800 rounded-tl-none"
                                      }`}
                                    >
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
                              onChange={(e) =>
                                setNewMessageText(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleSendChatMessage()
                              }
                              placeholder={t("Type your message...")}
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
                  {adminView === "teamadmin" &&
                    currentUser?.role === "super_admin" && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-gray-900">
                            {t("Administrators")}
                          </h2>
                          <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-4 py-2 bg-[#0E1526] hover:bg-gray-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1 shadow-sm transition-all"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>{t("Add Admin")}</span>
                          </button>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                          {members.filter((member) =>
                            ["Administrator", "Super Admin"].includes(
                              member.role,
                            ),
                          ).length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-400">
                              {t("No administrators found")}
                            </p>
                          ) : (
                            members
                              .filter((member) =>
                                ["Administrator", "Super Admin"].includes(
                                  member.role,
                                ),
                              )
                              .map((member) => {
                                const memberProjects = projects.filter(
                                  (project) =>
                                    project.team.includes(member.name),
                                );
                                return (
                                  <div
                                    key={member.id}
                                    className="pb-6 border-b border-gray-100 last:border-0 last:pb-0"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                                        {member.name
                                          .split(/\s+/)
                                          .map((part) => part[0])
                                          .join("")
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </div>
                                      <div>
                                        <h3 className="font-bold text-sm text-gray-900">
                                          {member.name}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                          {member.email} · {member.role} ·{" "}
                                          {member.since}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-4 ml-16 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {t("Member Projects")}
                                      </h4>
                                      {memberProjects.length === 0 ? (
                                        <p className="text-xs text-gray-400">
                                          {t("Not assigned to any project")}
                                        </p>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {memberProjects.map((project) => (
                                            <div
                                              key={project.id}
                                              className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                                            >
                                              <span className="font-semibold text-gray-700">
                                                {project.name}
                                              </span>
                                              <span className="font-bold text-blue-500">
                                                {project.progress}%
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                          )}
                          {false && (
                            <>
                              {/* Ahmed Hassan Card */}
                              <div className="pb-6 border-b border-gray-100">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                                    AH
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-sm text-gray-900">
                                      Ahmed Hassan
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                      ahmed.h@opsflow.io · Admin since Jan 2024
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 ml-16 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Managed Pipelines
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {projects.slice(0, 2).map((p) => (
                                      <div
                                        key={p.id}
                                        className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                                      >
                                        <span className="font-semibold text-gray-700">
                                          {p.name}
                                        </span>
                                        <span className="font-bold text-blue-500">
                                          {p.progress}%
                                        </span>
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
                                    <h3 className="font-bold text-sm text-gray-900">
                                      Nadia Qasim
                                    </h3>
                                    <p className="text-xs text-gray-400">
                                      nadia.q@opsflow.io · Admin since Mar 2023
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 ml-16 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Managed Pipelines
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {projects.slice(2, 5).map((p) => (
                                      <div
                                        key={p.id}
                                        className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-100"
                                      >
                                        <span className="font-semibold text-gray-700">
                                          {p.name}
                                        </span>
                                        <span className="font-bold text-blue-500">
                                          {p.progress}%
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  {/* ADMIN VIEW: TEAM MEMBERS DIRECTORY CARD GRID */}
                  {adminView === "teammembers" && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">
                            {t("Team Members Overview")}
                          </h2>
                          <p className="text-xs text-gray-500">
                            Track task loading and availability across operators
                          </p>
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
                          const assignedTasks = tasks.filter(
                            (t) => t.assignedTo === m.name,
                          );
                          const completedCount = assignedTasks.filter(
                            (t) => t.status === "Completed",
                          ).length;
                          const completionRate =
                            assignedTasks.length > 0
                              ? Math.round(
                                  (completedCount / assignedTasks.length) * 100,
                                )
                              : 0;

                          return (
                            <div
                              key={m.id}
                              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-all"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-extrabold text-xs flex items-center justify-center shadow-inner">
                                    {m.name
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-sm text-gray-900">
                                      {m.name}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-semibold">
                                      {m.role} · {m.department}
                                    </p>
                                  </div>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                    m.status === "Active"
                                      ? "bg-green-50 text-green-600"
                                      : "bg-orange-50 text-orange-600"
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </div>

                              <div className="space-y-2 mt-auto">
                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                  <span>{t("Task Completion")}</span>
                                  <span className="font-bold text-gray-900">
                                    {completionRate}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${completionRate}%` }}
                                  ></div>
                                </div>

                                <div className="flex justify-between pt-3 border-t border-gray-50 text-[10px] text-gray-400 font-semibold">
                                  <span>
                                    {assignedTasks.length} Assigned Tasks
                                  </span>
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
                        <h3 className="font-extrabold text-sm text-gray-900 mb-4">
                          {t("My Projects")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects.map((p) => (
                            <div
                              key={p.id}
                              className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: p.color }}
                                ></span>
                                <span className="font-bold text-gray-800">
                                  {p.name}
                                </span>
                              </div>
                              <span className="font-bold text-blue-500">
                                {p.progress}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* My Tasks progress and listings */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Task Progress Donut */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-4">
                          <h3 className="font-extrabold text-xs text-gray-800 uppercase tracking-wide">
                            {t("My Completion Rate")}
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {t("Completions across all sprint tasks")}
                          </p>

                          <div className="my-6 flex justify-center">
                            <div className="relative w-32 h-32">
                              <svg
                                className="w-full h-full transform -rotate-90"
                                viewBox="0 0 36 36"
                              >
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="transparent"
                                  stroke="#F1F5F9"
                                  strokeWidth="4"
                                />
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
                                <span className="text-2xl font-black text-gray-900">
                                  {staffTasksProgressPercent}%
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase">
                                  {t("Done")}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-center text-xs text-gray-500">
                            <b>{staffCompletedTasksCount}</b> out of{" "}
                            <b>{staffTasksList.length}</b> tasks completed
                          </div>
                        </div>

                        {/* List Sorted by Date */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-8">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                            <h3 className="font-extrabold text-sm text-gray-900">
                              {t("My Tasks")}
                            </h3>
                            {/* Filter tabs */}
                            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
                              <button
                                onClick={() => setStaffFilter("all")}
                                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                  staffFilter === "all"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                {t("All")}
                              </button>
                              <button
                                onClick={() => setStaffFilter("done")}
                                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                  staffFilter === "done"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                {t("Done")}
                              </button>
                              <button
                                onClick={() => setStaffFilter("notdone")}
                                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                  staffFilter === "notdone"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-950"
                                }`}
                              >
                                {t("Remaining")}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {getFilteredStaffTasks().length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                {t("No tasks matched the category filters.")}
                              </p>
                            ) : (
                              getFilteredStaffTasks().map((t) => {
                                const matchedProj = projects.find(
                                  (p) => p.id === t.projectId,
                                );
                                return (
                                  <div
                                    key={t.id}
                                    className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/70 rounded-xl border border-gray-100 transition-all text-xs"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <button
                                        onClick={() =>
                                          handleToggleTaskStatus(t.id, t.status)
                                        }
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                          t.status === "Completed"
                                            ? "bg-[#22C55E] border-[#22C55E] text-white"
                                            : "border-gray-300"
                                        }`}
                                      >
                                        {t.status === "Completed" && (
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <div className="min-w-0">
                                        <h4
                                          className={`font-bold text-gray-900 truncate ${t.status === "Completed" ? "line-through text-gray-400 font-normal" : ""}`}
                                        >
                                          {t.name}
                                        </h4>
                                        <span
                                          className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mt-0.5"
                                          style={{ color: matchedProj?.color }}
                                        >
                                          {matchedProj?.name} · {t.date}
                                        </span>
                                      </div>
                                    </div>

                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                        t.priority === "High"
                                          ? "bg-red-50 text-red-600"
                                          : "bg-orange-50 text-orange-600"
                                      }`}
                                    >
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

                  {staffView === "projects" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {t("My Projects")}
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                          {t("Projects available to your account.")}
                        </p>
                      </div>
                      {projects.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                          {t("No projects are assigned to your account.")}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                          {projects.map((project) => (
                            <div
                              key={project.id}
                              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <h3 className="font-bold text-gray-900">
                                    {project.name}
                                  </h3>
                                </div>
                                <span className="text-xs font-bold text-blue-600">
                                  {project.progress}%
                                </span>
                              </div>
                              <p className="mt-3 text-xs leading-5 text-gray-500">
                                {project.description || t("No description")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {staffView === "tasks" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {t("Tasks")}
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                          {t("Tasks in projects available to your account.")}
                        </p>
                      </div>
                      {tasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
                          {t("No tasks are available yet.")}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tasks.map((task) => {
                            const project = projects.find(
                              (item) => item.id === task.projectId,
                            );
                            return (
                              <div
                                key={task.id}
                                className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div>
                                  <h3 className="text-sm font-bold text-gray-900">
                                    {task.name}
                                  </h3>
                                  <p className="mt-1 text-xs text-gray-400">
                                    {project?.name ?? t("Project")} ·{" "}
                                    {task.assignedTo}
                                  </p>
                                </div>
                                <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">
                                  {task.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STAFF VIEW: CHAT GROUPS & CONTACTS */}
                  {(staffView === "chatprojects" ||
                    staffView === "chatcontacts") && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[560px]">
                        {/* Conversation lists Left */}
                        <div className="md:col-span-4 border-r border-gray-100 flex flex-col h-full bg-[#FAFBFD]">
                          <div className="p-4 bg-white border-b border-gray-100">
                            <h3 className="font-extrabold text-sm text-gray-900 mb-2">
                              {t("My Conversations")}
                            </h3>
                            <div className="relative bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-gray-400">
                              <Search className="w-3.5 h-3.5" />
                              <input
                                type="text"
                                placeholder={t("Search direct rooms...")}
                                className="bg-transparent border-none text-xs w-full focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {staffView === "chatprojects"
                              ? projects.map((proj) => (
                                  <div
                                    key={proj.id}
                                    onClick={() =>
                                      handleOpenConversation("proj", proj.id)
                                    }
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                      chatType === "proj" &&
                                      chatTarget === proj.id
                                        ? "bg-blue-50"
                                        : "hover:bg-gray-100/60"
                                    }`}
                                  >
                                    <div
                                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-extrabold flex-shrink-0"
                                      style={{ backgroundColor: proj.color }}
                                    >
                                      💬
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex justify-between items-baseline">
                                        <h4 className="font-bold text-xs text-gray-900 truncate">
                                          {proj.name}
                                        </h4>
                                        {unreadChatCount("proj", proj.id) >
                                          0 && (
                                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                            {unreadChatCount("proj", proj.id)}
                                          </span>
                                        )}
                                        {unreadChatCount("proj", proj.id) ===
                                          0 && (
                                          <span className="text-[9px] text-gray-400">
                                            {latestChatMessage("proj", proj.id)
                                              ?.timestamp ?? ""}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                        {latestChatMessage("proj", proj.id)
                                          ?.text ?? t("No messages yet")}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              : // Contact direct conversations list for staff
                                chatContacts.map((m) => {
                                  return (
                                    <div
                                      key={m.id}
                                      onClick={() =>
                                        handleOpenConversation("dm", m.id)
                                      }
                                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                        chatType === "dm" && chatTarget === m.id
                                          ? "bg-blue-50"
                                          : "hover:bg-gray-100/60"
                                      }`}
                                    >
                                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center flex-shrink-0">
                                        {m.name
                                          .split(" ")
                                          .map((w) => w[0])
                                          .join("")}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <h4 className="font-bold text-xs text-gray-900 truncate">
                                            {m.name}
                                          </h4>
                                          {unreadChatCount("dm", m.id) > 0 && (
                                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                              {unreadChatCount("dm", m.id)}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                          {latestChatMessage("dm", m.id)
                                            ?.text ?? t("No messages yet")}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                          </div>
                        </div>

                        {/* Message screen Right */}
                        <div className="md:col-span-8 flex flex-col h-full bg-white">
                          <div className="p-4 border-b border-gray-100">
                            <h4 className="font-bold text-xs text-gray-900">
                              {chatType === "proj"
                                ? projects.find((p) => p.id === chatTarget)
                                    ?.name
                                : contacts.find((m) => m.id === chatTarget)
                                    ?.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-medium">
                              OpsFlow live communication channel
                            </p>
                          </div>

                          {/* Messages Flow */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {currentChatMessages.map((msg) => {
                              const isMe = msg.sender.name === currentUserName;
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex items-start gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                                >
                                  {!isMe && (
                                    <div
                                      className="w-7 h-7 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0"
                                      style={{
                                        backgroundColor: msg.sender.color,
                                      }}
                                    >
                                      {msg.sender.initials}
                                    </div>
                                  )}

                                  <div
                                    className={`space-y-1 ${isMe ? "text-right" : ""}`}
                                  >
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span className="text-[10px] font-bold text-gray-900">
                                        {msg.sender.name}
                                      </span>
                                      <span className="text-[9px] text-gray-400">
                                        {msg.timestamp}
                                      </span>
                                    </div>
                                    <div
                                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                        isMe
                                          ? "bg-blue-600 text-white rounded-tr-none"
                                          : "bg-gray-100 text-gray-800 rounded-tl-none"
                                      }`}
                                    >
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
                              onChange={(e) =>
                                setNewMessageText(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleSendChatMessage()
                              }
                              placeholder={t("Type your message...")}
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
                      <h2 className="text-xl font-bold text-gray-900">
                        {t("Workspace Colleagues")}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-xs space-y-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center">
                                {m.name
                                  .split(" ")
                                  .map((w) => w[0])
                                  .join("")}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">
                                  {m.name}
                                </h3>
                                <p className="text-[10px] text-gray-400 font-semibold">
                                  {m.role} · {m.department}
                                </p>
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
                <h3 className="font-black text-xs uppercase tracking-wider">
                  OpsFlow AI brain
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close AI assistant"
                onClick={() => setIsAiOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Messages flow */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-purple-600 text-white rounded-tr-none"
                        : "bg-gray-100 text-gray-800 rounded-tl-none font-medium"
                    }`}
                  >
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
                    <p className="text-[10px] text-gray-400 font-semibold italic">
                      {aiEncouragingMsg}
                    </p>
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
                placeholder={t("Ask assistant anything...")}
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

      {editingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E1526]/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-project-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="edit-project-title" className="font-bold text-gray-900">
                {t("Edit Project")}
              </h3>
              <button
                aria-label="Close project editor"
                onClick={() => setEditingProject(null)}
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={editingProject.name}
                onChange={(event) =>
                  setEditingProject({
                    ...editingProject,
                    name: event.target.value,
                  })
                }
                placeholder={t("Project Name")}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <textarea
                value={editingProject.description}
                onChange={(event) =>
                  setEditingProject({
                    ...editingProject,
                    description: event.target.value,
                  })
                }
                placeholder={t("Description")}
                className="min-h-24 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={editingProject.startDate}
                  onChange={(event) =>
                    setEditingProject({
                      ...editingProject,
                      startDate: event.target.value,
                    })
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={editingProject.endDate}
                  onChange={(event) =>
                    setEditingProject({
                      ...editingProject,
                      endDate: event.target.value,
                    })
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <input
                type="color"
                value={editingProject.color}
                onChange={(event) =>
                  setEditingProject({
                    ...editingProject,
                    color: event.target.value,
                  })
                }
                className="h-10 w-full rounded-xl border border-gray-200"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingProject(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-bold"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleUpdateProject}
                  className="flex-1 rounded-xl bg-[#0E1526] py-2 text-xs font-bold text-white"
                >
                  {t("Save Changes")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E1526]/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="edit-task-title" className="font-bold text-gray-900">
                {t("Edit Task")}
              </h3>
              <button
                aria-label="Close task editor"
                onClick={() => setEditingTask(null)}
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={editingTask.name}
                onChange={(event) =>
                  setEditingTask({ ...editingTask, name: event.target.value })
                }
                placeholder={t("Task Name")}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
              <select
                value={editingTask.assigneeId ?? ""}
                onChange={(event) => {
                  const participant = projects
                    .find((project) => project.id === editingTask.projectId)
                    ?.participants.find(
                      (item) => item.id === event.target.value,
                    );
                  setEditingTask({
                    ...editingTask,
                    assigneeId: event.target.value || null,
                    assignedTo: participant?.name ?? "Unassigned",
                  });
                }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">{t("Unassigned")}</option>
                {(
                  projects.find(
                    (project) => project.id === editingTask.projectId,
                  )?.participants ?? []
                )
                  .filter((participant) => participant.systemRole === "staff")
                  .map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editingTask.priority}
                  onChange={(event) =>
                    setEditingTask({
                      ...editingTask,
                      priority: event.target.value as Task["priority"],
                    })
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="High">{t("High")}</option>
                  <option value="Medium">{t("Medium")}</option>
                  <option value="Low">{t("Low")}</option>
                </select>
                <select
                  value={editingTask.status}
                  onChange={(event) =>
                    setEditingTask({
                      ...editingTask,
                      status: event.target.value as Task["status"],
                    })
                  }
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="Completed">{t("Completed")}</option>
                  <option value="In Progress">{t("In Progress")}</option>
                  <option value="Not Started">{t("Not Started")}</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingTask(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-bold"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleUpdateTask}
                  className="flex-1 rounded-xl bg-[#0E1526] py-2 text-xs font-bold text-white"
                >
                  {t("Save Changes")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVITE MEMBER */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-[#0E1526]/40 flex items-center justify-center z-[100] p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-dialog-title"
            className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                id="invite-dialog-title"
                className="font-bold text-sm text-gray-900"
              >
                {t("Invite a Team Member")}
              </h3>
              <button
                type="button"
                aria-label="Close invitation dialog"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-gray-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@opsflow.io"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Role / Title
                </label>
                <input
                  type="text"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder="e.g. Frontend Engineer"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Assign to Project (optional)
                </label>
                <select
                  value={inviteProjId}
                  onChange={(e) => setInviteProjId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="">{t("None")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-dialog-title"
            className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-gray-50"
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                id="task-dialog-title"
                className="font-bold text-sm text-gray-900"
              >
                {t("Add Task")}
              </h3>
              <button
                type="button"
                aria-label="Close task dialog"
                onClick={() => setIsAddTaskOpen(false)}
                className="text-gray-400 hover:text-gray-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("Task Name")}
                </label>
                <input
                  type="text"
                  value={ntName}
                  onChange={(e) => setNtName(e.target.value)}
                  placeholder="e.g. Design payment module"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("Assignee")}
                </label>
                <select
                  value={ntAssignee}
                  onChange={(e) => setNtAssignee(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="">{t("Select team member")}</option>
                  {(activeProject?.participants ?? [])
                    .filter(
                      (participant) =>
                        !participant.isOwner &&
                        participant.systemRole === "staff",
                    )
                    .map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  {t("Priority")}
                </label>
                <select
                  value={ntPriority}
                  onChange={(e) =>
                    setNtPriority(e.target.value as "High" | "Medium" | "Low")
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="High">{t("High")}</option>
                  <option value="Medium">{t("Medium")}</option>
                  <option value="Low">{t("Low")}</option>
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
                  {t("Create Task")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
