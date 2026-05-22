import type { ActivityKind, ActivityStatus } from "@/app/types/database";

export interface Course {
  id: string;
  name: string;
  instructor: string;
  color: string;
  description: string;
  notes: string;
}

export interface CourseLink {
  id: string;
  courseId: string;
  label: string;
  url: string;
  description: string;
}

export interface Activity {
  id: string;
  courseId: string | null;
  title: string;
  kind: ActivityKind;
  status: ActivityStatus;
  scheduledFor: string;
  timeLabel: string;
  description: string;
}

export interface Reminder {
  id: string;
  courseId: string | null;
  title: string;
  kind: ActivityKind;
  dueDate: string;
  points: number;
}

export interface NonSchoolItem {
  id: string;
  title: string;
  category: string;
  scheduledFor: string;
  timeLabel: string;
  description: string;
}

export interface PlannerSnapshot {
  courses: Course[];
  courseLinks: CourseLink[];
  activities: Activity[];
  reminders: Reminder[];
  nonSchoolItems: NonSchoolItem[];
}

export const coursePalette = [
  "#ff8ca4",
  "#ff9f7c",
  "#ffbf5f",
  "#8fcf67",
  "#67c9b7",
  "#7fd3eb",
  "#6f9cf2",
  "#9c74e6",
  "#e387d4",
  "#b6afcc"
] as const;

export const activityKindOptions: { value: ActivityKind; label: string }[] = [
  { value: "exam", label: "Exam" },
  { value: "hw", label: "HW" },
  { value: "lab", label: "Lab" },
  { value: "study", label: "Study" },
  { value: "other", label: "Other" }
];

export const activityStatusOptions: { value: ActivityStatus; label: string }[] = [
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "not_done", label: "Not Done" }
];

export const navItems = [
  "Dashboard",
  "Calendar",
  "Courses",
  "To Do",
  "Notes & Links",
  "Activities",
  "Settings"
];
