import type { Activity, Course, CourseLink, NonSchoolItem, PlannerSnapshot, Reminder } from "@/app/types/planner";

import { coursePalette } from "@/app/types/planner";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 11)}`;
}

export function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getMonthGrid(anchor: Date) {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstVisible = new Date(firstDay);
  firstVisible.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisible);
    date.setDate(firstVisible.getDate() + index);
    return date;
  });
}

export function isSameDate(left: string | Date, right: string | Date) {
  const leftDate = typeof left === "string" ? new Date(`${left}T00:00:00`) : left;
  const rightDate = typeof right === "string" ? new Date(`${right}T00:00:00`) : right;

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

export function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatFriendlyDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateValue}T00:00:00`));
}

export function formatLongDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateValue}T00:00:00`));
}

export function tintedColor(color: string, alpha: number) {
  const sanitized = color.replace("#", "");

  if (sanitized.length !== 6) {
    return color;
  }

  const red = parseInt(sanitized.slice(0, 2), 16);
  const green = parseInt(sanitized.slice(2, 4), 16);
  const blue = parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function activityLabel(kind: Activity["kind"]) {
  switch (kind) {
    case "exam":
      return "Exam";
    case "hw":
      return "HW";
    case "lab":
      return "Lab";
    case "study":
      return "Study";
    default:
      return "Other";
  }
}

export function activityStatusLabel(status: Activity["status"]) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    default:
      return "Not Done";
  }
}

export function getCategoryGlyph(category: string) {
  const normalized = category.toLowerCase();

  if (normalized.includes("gym") || normalized.includes("workout")) {
    return "⌁";
  }

  if (normalized.includes("grocery") || normalized.includes("shopping")) {
    return "▣";
  }

  if (normalized.includes("volunteer")) {
    return "♡";
  }

  if (normalized.includes("lunch") || normalized.includes("dinner")) {
    return "⋈";
  }

  return "•";
}

export function buildPreviewSnapshot(): PlannerSnapshot {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const courses: Course[] = [
    {
      id: generateId(),
      name: "Pharmacology",
      instructor: "Prof. May Patel",
      color: coursePalette[7],
      description: "Medication safety, dosage review, and therapeutic effects.",
      notes: "Focus on med calculations and adverse effects. Review ATI practice questions."
    },
    {
      id: generateId(),
      name: "Med-Surg Nursing",
      instructor: "Prof. Sarah Johnson",
      color: coursePalette[0],
      description: "Adult health concepts, lecture recaps, and patient-care plans.",
      notes: "Keep wound-care flow sheets and lecture objectives in one place."
    },
    {
      id: generateId(),
      name: "Health Assessment",
      instructor: "Dr. Lauren Park",
      color: coursePalette[6],
      description: "Head-to-toe assessments and charting practice.",
      notes: "Practice documentation language before each lab check-off."
    },
    {
      id: generateId(),
      name: "Anatomy & Physiology",
      instructor: "Dr. Neil Gomez",
      color: coursePalette[3],
      description: "Systems review and anatomy drills.",
      notes: "Use diagrams and flashcards for quick weekly retention checks."
    }
  ];

  const courseLinks: CourseLink[] = [
    {
      id: generateId(),
      courseId: courses[0].id,
      label: "ATI Pharmacology Practice",
      url: "https://example.com/ati-pharm",
      description: "Practice questions"
    },
    {
      id: generateId(),
      courseId: courses[0].id,
      label: "Khan Academy Drug Classifications",
      url: "https://example.com/drug-classifications",
      description: "Study resource"
    },
    {
      id: generateId(),
      courseId: courses[1].id,
      label: "Med-Surg Wound Care Guide",
      url: "https://example.com/wound-care",
      description: "Lecture companion"
    }
  ];

  const activities: Activity[] = [
    buildPreviewActivity(courses[1].id, "Lecture: Med-Surg", "study", "in_progress", year, month, 2, "8:00 AM", "Review post-op care notes."),
    buildPreviewActivity(courses[0].id, "HW: Ch. 8", "hw", "in_progress", year, month, 3, "11:59 PM", "Drug classifications worksheet."),
    buildPreviewActivity(courses[1].id, "Lab: IV Therapy", "lab", "done", year, month, 5, "1:00 PM", "Bring competency checklist."),
    buildPreviewActivity(courses[0].id, "Exam Review", "study", "in_progress", year, month, 8, "6:00 PM", "Focus on autonomic meds."),
    buildPreviewActivity(courses[2].id, "Discussion Post", "hw", "done", year, month, 9, "9:00 PM", "Health history reflection."),
    buildPreviewActivity(courses[3].id, "Lecture: Anatomy", "study", "done", year, month, 12, "10:00 AM", "Respiratory system overview."),
    buildPreviewActivity(courses[0].id, "Study Session", "study", "in_progress", year, month, 16, "5:00 PM", "Flashcard sprint and dosage drills."),
    buildPreviewActivity(courses[1].id, "HW: Care Plan", "hw", "not_done", year, month, 18, "11:00 PM", "Include priorities and outcomes."),
    buildPreviewActivity(courses[0].id, "Exam", "exam", "not_done", year, month, 20, "8:00 AM", "Covers Chapters 1-5."),
    buildPreviewActivity(courses[1].id, "Lab Report", "lab", "in_progress", year, month, 23, "11:59 PM", "IV therapy reflection paper."),
    buildPreviewActivity(courses[2].id, "Lecture", "study", "done", year, month, 25, "1:00 PM", "Cardiac assessment review."),
    buildPreviewActivity(courses[3].id, "Quiz", "exam", "done", year, month, 30, "12:00 PM", "Short muscular system quiz.")
  ];

  const reminders: Reminder[] = [
    {
      id: generateId(),
      courseId: courses[0].id,
      title: "Pharmacology Exam",
      kind: "exam",
      dueDate: toDateInputValue(new Date(year, month, 20)),
      points: 10
    },
    {
      id: generateId(),
      courseId: courses[1].id,
      title: "Lab Report - IV Therapy",
      kind: "lab",
      dueDate: toDateInputValue(new Date(year, month, 23)),
      points: 5
    },
    {
      id: generateId(),
      courseId: courses[2].id,
      title: "Health Assessment HW",
      kind: "hw",
      dueDate: toDateInputValue(new Date(year, month, 25)),
      points: 5
    }
  ];

  const nonSchoolItems: NonSchoolItem[] = [
    buildPreviewLifeItem("Gym", "Workout", year, month, 9, "6:00 PM", "Quick strength session."),
    buildPreviewLifeItem("Grocery Run", "Shopping", year, month, 10, "10:00 AM", "Meal prep ingredients."),
    buildPreviewLifeItem("Nurse Volunteer", "Volunteer", year, month, 15, "9:00 AM", "Clinic support shift."),
    buildPreviewLifeItem("Lunch with Mia", "Lunch", year, month, 18, "1:00 PM", "Catch up after lab.")
  ];

  return {
    courses,
    courseLinks,
    activities,
    reminders,
    nonSchoolItems
  };
}

function buildPreviewActivity(
  courseId: string,
  title: string,
  kind: Activity["kind"],
  status: Activity["status"],
  year: number,
  month: number,
  day: number,
  timeLabel: string,
  description: string
): Activity {
  return {
    id: generateId(),
    courseId,
    title,
    kind,
    status,
    scheduledFor: toDateInputValue(new Date(year, month, day)),
    timeLabel,
    description
  };
}

function buildPreviewLifeItem(
  title: string,
  category: string,
  year: number,
  month: number,
  day: number,
  timeLabel: string,
  description: string
): NonSchoolItem {
  return {
    id: generateId(),
    title,
    category,
    scheduledFor: toDateInputValue(new Date(year, month, day)),
    timeLabel,
    description
  };
}
