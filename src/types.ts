export interface Project {
  id: string;
  name: string;
  description: string;
  status: "In Progress" | "Review" | "Planning" | "Completed";
  startDate: string;
  endDate: string;
  progress: number;
  color: string;
  team: string[];
  participants: ProjectParticipant[];
}

export interface ProjectParticipant {
  id: string;
  name: string;
  email: string;
  systemRole: "staff" | "admin" | "super_admin";
  projectRole: "viewer" | "member" | "manager";
  isOwner: boolean;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  relatedProjectId: number | null;
  relatedTaskId: number | null;
  actorId: number | null;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  assignedTo: string;
  assigneeId: string | null;
  priority: "High" | "Medium" | "Low";
  status: "Completed" | "In Progress" | "Not Started";
  date: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Away";
  since: string;
}

export interface ChatMessage {
  id: string;
  type: "proj" | "dm";
  targetId: string;
  sender: {
    name: string;
    initials: string;
    color: string;
  };
  text: string;
  timestamp: string;
}
