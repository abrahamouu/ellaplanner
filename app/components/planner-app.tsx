"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Bell,
  BookHeart,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleDashed,
  ClipboardList,
  ExternalLink,
  Heart,
  Link2,
  LoaderCircle,
  LogIn,
  LogOut,
  NotebookPen,
  PencilLine,
  Plus,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";

import { activityLabel, buildPreviewSnapshot, cx, formatFriendlyDate, formatLongDate, formatMonthTitle, generateId, getCategoryGlyph, getMonthGrid, isSameDate, tintedColor, toDateInputValue } from "@/app/lib/planner-utils";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/app/lib/supabase";
import type { Database } from "@/app/types/database";
import type { Activity, Course, CourseLink, NonSchoolItem, PlannerSnapshot, Reminder } from "@/app/types/planner";
import { activityKindOptions, activityStatusOptions, coursePalette, navItems } from "@/app/types/planner";

type AppSupabaseClient = SupabaseClient<Database>;
type ModalKey = "course" | "activity" | "reminder" | "link" | "life" | null;
const emptySnapshot: PlannerSnapshot = {
  courses: [],
  courseLinks: [],
  activities: [],
  reminders: [],
  nonSchoolItems: []
};

interface CourseDraft {
  id: string | null;
  name: string;
  instructor: string;
  color: string;
  description: string;
  notes: string;
}

interface ActivityDraft {
  title: string;
  courseId: string;
  kind: Activity["kind"];
  status: Activity["status"];
  scheduledFor: string;
  timeLabel: string;
  description: string;
}

interface ReminderDraft {
  title: string;
  courseId: string;
  kind: Reminder["kind"];
  dueDate: string;
  points: string;
}

interface LinkDraft {
  courseId: string;
  label: string;
  url: string;
  description: string;
}

interface LifeDraft {
  title: string;
  category: string;
  scheduledFor: string;
  timeLabel: string;
  description: string;
}

export function PlannerApp() {
  const [supabase] = useState<AppSupabaseClient | null>(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [planner, setPlanner] = useState<PlannerSnapshot>(emptySnapshot);
  const [loadingRemoteData, setLoadingRemoteData] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [remindersExpanded, setRemindersExpanded] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [clearingPlanner, setClearingPlanner] = useState(false);
  const [courseDraft, setCourseDraft] = useState<CourseDraft>(() => createCourseDraft());
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>(() => createActivityDraft(""));
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft>(() => createReminderDraft(""));
  const [linkDraft, setLinkDraft] = useState<LinkDraft>(() => createLinkDraft(""));
  const [lifeDraft, setLifeDraft] = useState<LifeDraft>(() => createLifeDraft());
  const [isReady, setIsReady] = useState(false);

  const canPersist = Boolean(session && supabase);
  const isPreview = !canPersist;

  useEffect(() => {
    const today = new Date();
    const preview = buildPreviewSnapshot();

    setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setPlanner(preview);
    setSelectedCourseId(preview.courses[0]?.id ?? null);
    setNotesDraft(preview.courses[0]?.notes ?? "");
    setActivityDraft(createActivityDraft(preview.courses[0]?.id ?? "", toDateInputValue(today)));
    setReminderDraft(createReminderDraft(preview.courses[0]?.id ?? "", toDateInputValue(today)));
    setLinkDraft(createLinkDraft(preview.courses[0]?.id ?? ""));
    setLifeDraft(createLifeDraft(toDateInputValue(today)));
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setFeedback(error.message);
      }

      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!canPersist) {
      const preview = buildPreviewSnapshot();
      setPlanner(preview);
      setSelectedCourseId((current) => current ?? preview.courses[0]?.id ?? null);
      return;
    }

    void (async () => {
      if (!supabase || !session) {
        return;
      }

      setLoadingRemoteData(true);
      setFeedback(null);

      const [coursesResult, linksResult, activitiesResult, remindersResult, lifeResult] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: true }),
        supabase.from("course_links").select("*").order("created_at", { ascending: true }),
        supabase.from("activities").select("*").order("scheduled_for", { ascending: true }),
        supabase.from("reminders").select("*").order("due_date", { ascending: true }),
        supabase.from("non_school_items").select("*").order("scheduled_for", { ascending: true })
      ]);

      const error =
        coursesResult.error ||
        linksResult.error ||
        activitiesResult.error ||
        remindersResult.error ||
        lifeResult.error;

      if (error) {
        setFeedback(error.message);
        setLoadingRemoteData(false);
        return;
      }

      setPlanner({
        courses: (coursesResult.data ?? []).map(mapCourseRow),
        courseLinks: (linksResult.data ?? []).map(mapCourseLinkRow),
        activities: (activitiesResult.data ?? []).map(mapActivityRow),
        reminders: (remindersResult.data ?? []).map(mapReminderRow),
        nonSchoolItems: (lifeResult.data ?? []).map(mapLifeRow)
      });
      setLoadingRemoteData(false);
    })();
  }, [canPersist, isReady, session, supabase]);

  useEffect(() => {
    if (!planner.courses.length) {
      setSelectedCourseId(null);
      setNotesDraft("");
      return;
    }

    const selectedExists = planner.courses.some((course) => course.id === selectedCourseId);

    if (!selectedExists) {
      setSelectedCourseId(planner.courses[0].id);
      return;
    }

    const selectedCourse = planner.courses.find((course) => course.id === selectedCourseId);
    setNotesDraft(selectedCourse?.notes ?? "");
  }, [planner.courses, selectedCourseId]);

  if (!isReady || !selectedMonth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shell px-6">
        <div className="rounded-[32px] border border-line/70 bg-white px-6 py-5 text-center shadow-card">
          <p className="text-lg font-semibold text-rose-dark">Loading Ella&apos;s Planner...</p>
          <p className="mt-2 text-sm text-ink/60">Preparing your dashboard.</p>
        </div>
      </div>
    );
  }

  const monthDays = getMonthGrid(selectedMonth);
  const courseById = Object.fromEntries(planner.courses.map((course) => [course.id, course]));
  const selectedCourse = planner.courses.find((course) => course.id === selectedCourseId) ?? null;
  const monthActivities = planner.activities
    .filter((activity) => {
      const activityDate = new Date(`${activity.scheduledFor}T00:00:00`);
      const matchesMonth =
        activityDate.getFullYear() === selectedMonth.getFullYear() &&
        activityDate.getMonth() === selectedMonth.getMonth();
      const matchesCourse = courseFilter === "all" || activity.courseId === courseFilter;
      return matchesMonth && matchesCourse;
    })
    .sort((left, right) => `${left.scheduledFor}${left.timeLabel}`.localeCompare(`${right.scheduledFor}${right.timeLabel}`));
  const todayValue = toDateInputValue(new Date());
  const todayActivities = planner.activities
    .filter((activity) => isSameDate(activity.scheduledFor, todayValue))
    .sort((left, right) => left.timeLabel.localeCompare(right.timeLabel));
  const selectedCourseLinks = planner.courseLinks.filter((link) => link.courseId === selectedCourseId);
  const sortedReminders = [...planner.reminders].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const sortedLifeItems = [...planner.nonSchoolItems].sort(
    (left, right) => `${left.scheduledFor}${left.timeLabel}`.localeCompare(`${right.scheduledFor}${right.timeLabel}`)
  );
  const completedActivityPoints = planner.activities.filter((activity) => activity.status === "done").length * 5;
  const reminderPoints = planner.reminders.reduce((sum, reminder) => sum + reminder.points, 0);
  const totalPoints = completedActivityPoints + reminderPoints;
  const greeting = getGreeting();
  const userLabel = session?.user.user_metadata.full_name || session?.user.email?.split("@")[0] || "Ella";
  const hasPlannerContent =
    planner.courses.length > 0 ||
    planner.courseLinks.length > 0 ||
    planner.activities.length > 0 ||
    planner.reminders.length > 0 ||
    planner.nonSchoolItems.length > 0;

  async function handleGoogleLogin() {
    if (!supabase) {
      setFeedback("Add your Supabase URL and anon key in .env.local before Google login can start.");
      return;
    }

    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    if (error) {
      setFeedback(error.message);
    }
  }

  async function handleLogout() {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      setFeedback(error.message);
      return;
    }

    setPlanner(buildPreviewSnapshot());
    setFeedback(null);
  }

  function resetPlannerToBlank() {
    const todayValue = toDateInputValue(new Date());

    setPlanner(emptySnapshot);
    setSelectedCourseId(null);
    setCourseFilter("all");
    setNotesDraft("");
    setCourseDraft(createCourseDraft());
    setActivityDraft(createActivityDraft("", todayValue));
    setReminderDraft(createReminderDraft("", todayValue));
    setLinkDraft(createLinkDraft(""));
    setLifeDraft(createLifeDraft(todayValue));
    setActiveModal(null);
  }

  async function handleClearAll() {
    if (!hasPlannerContent) {
      setFeedback("The planner is already blank.");
      return;
    }

    const confirmed = window.confirm(
      canPersist
        ? "Clear all planner data? This will remove courses, activities, reminders, links, and non-school items from Supabase for your account."
        : "Clear everything from the preview planner? This will blank the current local view."
    );

    if (!confirmed) {
      return;
    }

    setClearingPlanner(true);

    if (canPersist && supabase && session) {
      const deleteResults = await Promise.all([
        supabase.from("course_links").delete().eq("user_id", session.user.id),
        supabase.from("activities").delete().eq("user_id", session.user.id),
        supabase.from("reminders").delete().eq("user_id", session.user.id),
        supabase.from("non_school_items").delete().eq("user_id", session.user.id),
        supabase.from("courses").delete().eq("user_id", session.user.id)
      ]);

      const error = deleteResults.find((result) => result.error)?.error;

      if (error) {
        setFeedback(error.message);
        setClearingPlanner(false);
        return;
      }
    }

    resetPlannerToBlank();
    setFeedback(canPersist ? "Planner cleared and saved to Supabase." : "Preview planner cleared.");
    setClearingPlanner(false);
  }

  function openCourseModal(course?: Course) {
    setCourseDraft(
      course
        ? {
            id: course.id,
            name: course.name,
            instructor: course.instructor,
            color: course.color,
            description: course.description,
            notes: course.notes
          }
        : createCourseDraft()
    );
    setActiveModal("course");
  }

  function openActivityModal(dateValue?: string) {
    setActivityDraft(createActivityDraft(selectedCourseId ?? "", dateValue));
    setActiveModal("activity");
  }

  function openReminderModal() {
    setReminderDraft(createReminderDraft(selectedCourseId ?? ""));
    setActiveModal("reminder");
  }

  function openLinkModal() {
    if (!selectedCourseId) {
      setFeedback("Add a course first so links have somewhere to live.");
      return;
    }

    setLinkDraft(createLinkDraft(selectedCourseId));
    setActiveModal("link");
  }

  function openLifeModal() {
    setLifeDraft(createLifeDraft());
    setActiveModal("life");
  }

  function shiftMonth(offset: number) {
    setSelectedMonth((current) => {
      if (!current) {
        return current;
      }

      return new Date(current.getFullYear(), current.getMonth() + offset, 1);
    });
  }

  function selectYear(year: number) {
    setSelectedMonth((current) => {
      if (!current) {
        return current;
      }

      return new Date(year, current.getMonth(), 1);
    });
  }

  function selectMonthIndex(monthIndex: number) {
    setSelectedMonth((current) => {
      if (!current) {
        return current;
      }

      return new Date(current.getFullYear(), monthIndex, 1);
    });
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!courseDraft.name.trim()) {
      setFeedback("Course name is required.");
      return;
    }

    const payload: Course = {
      id: courseDraft.id ?? generateId(),
      name: courseDraft.name.trim(),
      instructor: courseDraft.instructor.trim(),
      color: courseDraft.color,
      description: courseDraft.description.trim(),
      notes: courseDraft.notes.trim()
    };

    if (canPersist && supabase && session) {
      if (courseDraft.id) {
        const { data, error } = await supabase
          .from("courses")
          .update({
            name: payload.name,
            instructor: payload.instructor || null,
            color: payload.color,
            description: payload.description || null,
            notes: payload.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq("id", courseDraft.id)
          .select()
          .single();

        if (error) {
          setFeedback(error.message);
          return;
        }

        setPlanner((current) => ({
          ...current,
          courses: current.courses.map((course) => (course.id === data.id ? mapCourseRow(data) : course))
        }));
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert({
            user_id: session.user.id,
            name: payload.name,
            instructor: payload.instructor || null,
            color: payload.color,
            description: payload.description || null,
            notes: payload.notes || null
          })
          .select()
          .single();

        if (error) {
          setFeedback(error.message);
          return;
        }

        setPlanner((current) => ({
          ...current,
          courses: [...current.courses, mapCourseRow(data)]
        }));
        setSelectedCourseId(data.id);
      }
    } else {
      setPlanner((current) => ({
        ...current,
        courses: courseDraft.id
          ? current.courses.map((course) => (course.id === payload.id ? payload : course))
          : [...current.courses, payload]
      }));
      setSelectedCourseId(payload.id);
    }

    setFeedback(null);
    setActiveModal(null);
  }

  async function submitActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activityDraft.title.trim()) {
      setFeedback("Activity title is required.");
      return;
    }

    const payload: Activity = {
      id: generateId(),
      courseId: activityDraft.courseId || null,
      title: activityDraft.title.trim(),
      kind: activityDraft.kind,
      status: activityDraft.status,
      scheduledFor: activityDraft.scheduledFor,
      timeLabel: activityDraft.timeLabel.trim(),
      description: activityDraft.description.trim()
    };

    if (canPersist && supabase && session) {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          user_id: session.user.id,
          course_id: payload.courseId,
          title: payload.title,
          kind: payload.kind,
          status: payload.status,
          scheduled_for: payload.scheduledFor,
          time_label: payload.timeLabel || null,
          description: payload.description || null
        })
        .select()
        .single();

      if (error) {
        setFeedback(error.message);
        return;
      }

      setPlanner((current) => ({
        ...current,
        activities: [...current.activities, mapActivityRow(data)]
      }));
    } else {
      setPlanner((current) => ({
        ...current,
        activities: [...current.activities, payload]
      }));
    }

    setFeedback(null);
    setActiveModal(null);
  }

  async function submitReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reminderDraft.title.trim()) {
      setFeedback("Reminder title is required.");
      return;
    }

    const payload: Reminder = {
      id: generateId(),
      courseId: reminderDraft.courseId || null,
      title: reminderDraft.title.trim(),
      kind: reminderDraft.kind,
      dueDate: reminderDraft.dueDate,
      points: Number(reminderDraft.points) || 0
    };

    if (canPersist && supabase && session) {
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          user_id: session.user.id,
          course_id: payload.courseId,
          title: payload.title,
          kind: payload.kind,
          due_date: payload.dueDate,
          points: payload.points
        })
        .select()
        .single();

      if (error) {
        setFeedback(error.message);
        return;
      }

      setPlanner((current) => ({
        ...current,
        reminders: [...current.reminders, mapReminderRow(data)]
      }));
    } else {
      setPlanner((current) => ({
        ...current,
        reminders: [...current.reminders, payload]
      }));
    }

    setFeedback(null);
    setActiveModal(null);
  }

  async function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!linkDraft.courseId || !linkDraft.label.trim() || !linkDraft.url.trim()) {
      setFeedback("Course, label, and URL are required for a resource link.");
      return;
    }

    const payload: CourseLink = {
      id: generateId(),
      courseId: linkDraft.courseId,
      label: linkDraft.label.trim(),
      url: linkDraft.url.trim(),
      description: linkDraft.description.trim()
    };

    if (canPersist && supabase && session) {
      const { data, error } = await supabase
        .from("course_links")
        .insert({
          user_id: session.user.id,
          course_id: payload.courseId,
          label: payload.label,
          url: payload.url,
          description: payload.description || null
        })
        .select()
        .single();

      if (error) {
        setFeedback(error.message);
        return;
      }

      setPlanner((current) => ({
        ...current,
        courseLinks: [...current.courseLinks, mapCourseLinkRow(data)]
      }));
    } else {
      setPlanner((current) => ({
        ...current,
        courseLinks: [...current.courseLinks, payload]
      }));
    }

    setFeedback(null);
    setActiveModal(null);
  }

  async function submitLifeItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!lifeDraft.title.trim()) {
      setFeedback("A title helps keep non-school activities clear.");
      return;
    }

    const payload: NonSchoolItem = {
      id: generateId(),
      title: lifeDraft.title.trim(),
      category: lifeDraft.category.trim(),
      scheduledFor: lifeDraft.scheduledFor,
      timeLabel: lifeDraft.timeLabel.trim(),
      description: lifeDraft.description.trim()
    };

    if (canPersist && supabase && session) {
      const { data, error } = await supabase
        .from("non_school_items")
        .insert({
          user_id: session.user.id,
          title: payload.title,
          category: payload.category || null,
          scheduled_for: payload.scheduledFor,
          time_label: payload.timeLabel || null,
          description: payload.description || null
        })
        .select()
        .single();

      if (error) {
        setFeedback(error.message);
        return;
      }

      setPlanner((current) => ({
        ...current,
        nonSchoolItems: [...current.nonSchoolItems, mapLifeRow(data)]
      }));
    } else {
      setPlanner((current) => ({
        ...current,
        nonSchoolItems: [...current.nonSchoolItems, payload]
      }));
    }

    setFeedback(null);
    setActiveModal(null);
  }

  async function saveSelectedCourseNotes() {
    if (!selectedCourse) {
      return;
    }

    const nextNotes = notesDraft.trim();
    setSavingNotes(true);

    if (canPersist && supabase) {
      const { data, error } = await supabase
        .from("courses")
        .update({
          notes: nextNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedCourse.id)
        .select()
        .single();

      if (error) {
        setFeedback(error.message);
        setSavingNotes(false);
        return;
      }

      setPlanner((current) => ({
        ...current,
        courses: current.courses.map((course) => (course.id === data.id ? mapCourseRow(data) : course))
      }));
    } else {
      setPlanner((current) => ({
        ...current,
        courses: current.courses.map((course) => (course.id === selectedCourse.id ? { ...course, notes: nextNotes } : course))
      }));
    }

    setSavingNotes(false);
    setFeedback(null);
  }

  async function updateActivityStatus(activityId: string, status: Activity["status"]) {
    if (canPersist && supabase) {
      const { data, error } = await supabase
        .from("activities")
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", activityId)
        .select()
        .single();

      if (error) {
        setFeedback(error.message);
        return;
      }

      setPlanner((current) => ({
        ...current,
        activities: current.activities.map((activity) => (activity.id === activityId ? mapActivityRow(data) : activity))
      }));
      return;
    }

    setPlanner((current) => ({
      ...current,
      activities: current.activities.map((activity) => (activity.id === activityId ? { ...activity, status } : activity))
    }));
  }

  async function deleteLink(linkId: string) {
    if (canPersist && supabase) {
      const { error } = await supabase.from("course_links").delete().eq("id", linkId);

      if (error) {
        setFeedback(error.message);
        return;
      }
    }

    setPlanner((current) => ({
      ...current,
      courseLinks: current.courseLinks.filter((link) => link.id !== linkId)
    }));
  }

  async function deleteLifeItem(itemId: string) {
    if (canPersist && supabase) {
      const { error } = await supabase.from("non_school_items").delete().eq("id", itemId);

      if (error) {
        setFeedback(error.message);
        return;
      }
    }

    setPlanner((current) => ({
      ...current,
      nonSchoolItems: current.nonSchoolItems.filter((item) => item.id !== itemId)
    }));
  }

  async function deleteReminder(reminderId: string) {
    if (canPersist && supabase) {
      const { error } = await supabase.from("reminders").delete().eq("id", reminderId);

      if (error) {
        setFeedback(error.message);
        return;
      }
    }

    setPlanner((current) => ({
      ...current,
      reminders: current.reminders.filter((reminder) => reminder.id !== reminderId)
    }));
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(255,228,239,0.8)_38%,_rgba(255,248,251,1)_72%)] px-4 py-5 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[280px,minmax(0,1fr),320px]">
        <aside className="space-y-4">
          <div className="rounded-shell border border-line/60 bg-white/90 p-6 shadow-card backdrop-blur">
            <div className="relative overflow-hidden rounded-[28px] border border-rose/10 bg-[linear-gradient(180deg,rgba(255,244,248,1),rgba(255,255,255,1))] px-6 py-8 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(247,95,152,0.16),transparent_42%)]" />
              <div className="relative space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-rose/20 bg-white shadow-lg shadow-rose/10">
                  <BookHeart className="h-8 w-8 text-rose" />
                </div>
                <div>
                  <p className="font-[Snell_Roundhand,Brush_Script_MT,cursive] text-5xl leading-none text-rose">Ella&apos;s</p>
                  <p className="mt-2 text-lg font-semibold tracking-[0.35em] text-rose-dark">PLANNER</p>
                </div>
                <p className="text-sm text-ink/70">Plan. Study. Care. Succeed.</p>
                <div className="rounded-[24px] border border-line/60 bg-shell px-4 py-4 text-left">
                  <p className="text-base font-semibold text-ink">
                    {session ? `Welcome back, ${userLabel}` : "Welcome back!"}
                  </p>
                  <p className="mt-1 text-sm text-ink/65">
                    {session
                      ? "Your planner is syncing with Supabase."
                      : "Sign in with Google to sync, or explore the planner in preview mode."}
                  </p>
                  <div className="mt-4 space-y-2">
                    {session ? (
                      <>
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/20 transition hover:bg-rose-dark"
                          onClick={handleLogout}
                          type="button"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line/70 bg-white px-4 py-3 text-sm font-semibold text-rose-dark transition hover:border-rose/40 disabled:cursor-not-allowed disabled:opacity-55"
                          disabled={clearingPlanner || !hasPlannerContent}
                          onClick={() => void handleClearAll()}
                          type="button"
                        >
                          {clearingPlanner ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Clear All Data
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose/20 transition hover:bg-rose-dark disabled:cursor-not-allowed disabled:opacity-55"
                          disabled={!isSupabaseConfigured}
                          onClick={handleGoogleLogin}
                          type="button"
                        >
                          <LogIn className="h-4 w-4" />
                          Log in with Google
                        </button>
                        <button
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line/70 bg-white px-4 py-3 text-sm font-semibold text-rose-dark transition hover:border-rose/40 disabled:cursor-not-allowed disabled:opacity-55"
                          disabled={clearingPlanner || !hasPlannerContent}
                          onClick={() => void handleClearAll()}
                          type="button"
                        >
                          {clearingPlanner ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          Clear Preview
                        </button>
                      </>
                    )}
                    {!isSupabaseConfigured && (
                      <p className="rounded-2xl border border-dashed border-line bg-white px-3 py-2 text-xs text-ink/60">
                        Add your Supabase keys in <code>.env.local</code> to turn on Google auth and persistent storage.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-shell border border-line/60 bg-white/90 p-4 shadow-card backdrop-blur">
            <div className="space-y-1">
              {navItems.map((item, index) => (
                <button
                  className={cx(
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                    index === 0 ? "bg-[linear-gradient(90deg,rgba(247,95,152,0.16),rgba(255,243,235,0.55))] text-rose-dark" : "text-ink/70 hover:bg-shell"
                  )}
                  key={item}
                  type="button"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-rose shadow-sm">
                    {renderNavGlyph(index)}
                  </span>
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-[28px] border border-rose/15 bg-[linear-gradient(135deg,rgba(255,249,252,1),rgba(255,234,244,0.95))] p-4">
              <p className="text-sm font-semibold text-rose-dark">You&apos;re doing amazing!</p>
              <p className="mt-1 text-xs text-ink/65">Keep building momentum one class, one task, one calm day at a time.</p>
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <section className="rounded-shell border border-line/60 bg-white/90 p-5 shadow-card backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-shell px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-rose-dark">
                    Ella&apos;s Planner
                  </span>
                  {loadingRemoteData && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-peach px-3 py-1 text-xs font-semibold text-rose-dark">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Syncing
                    </span>
                  )}
                  {authLoading && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-lavender px-3 py-1 text-xs font-semibold text-rose-dark">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Loading session
                    </span>
                  )}
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  {greeting}, {userLabel}! <span className="text-2xl text-rose">☼</span>
                </h1>
                <p className="mt-2 text-sm text-ink/65">
                  Keep school, reminders, and life plans in one soft but focused space.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start rounded-[24px] border border-line/60 bg-shell px-4 py-3 text-sm text-ink/70">
                <Heart className="h-4 w-4 text-rose" />
                {isPreview ? "Preview mode is active until you sign in." : "Google login is active and data is saved in Supabase."}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line/70 bg-white px-4 py-2.5 text-sm font-semibold text-rose-dark transition hover:border-rose/40 disabled:cursor-not-allowed disabled:opacity-55"
                disabled={clearingPlanner || !hasPlannerContent}
                onClick={() => void handleClearAll()}
                type="button"
              >
                {clearingPlanner ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {canPersist ? "Clear All Planner Data" : "Clear Preview Data"}
              </button>
              <p className="text-sm text-ink/55">
                {canPersist
                  ? "When you're logged in, clearing removes everything from Supabase and leaves you with a blank planner."
                  : "Preview data can be cleared locally now, then your real blank planner will save to Supabase after login."}
              </p>
            </div>
            {feedback && (
              <div className="mt-4 rounded-3xl border border-rose/20 bg-peach px-4 py-3 text-sm text-rose-dark">{feedback}</div>
            )}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr),320px]">
            <div className="rounded-shell border border-line/60 bg-white/90 p-5 shadow-card backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(247,95,152,0.18),rgba(255,191,95,0.14))] p-2 text-rose-dark">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-rose-dark">Urgent Reminders</h2>
                    <p className="text-sm text-ink/60">Collapsible, high-visibility reminders with points attached.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-white text-rose transition hover:border-rose/40"
                    onClick={() => setRemindersExpanded((current) => !current)}
                    type="button"
                  >
                    {remindersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose text-white shadow-lg shadow-rose/20 transition hover:bg-rose-dark"
                    onClick={openReminderModal}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {remindersExpanded ? (
                <div className="mt-5 space-y-3">
                  {sortedReminders.length ? (
                    sortedReminders.map((reminder) => {
                      const course = reminder.courseId ? courseById[reminder.courseId] : undefined;

                      return (
                        <div
                          className="flex flex-col gap-3 rounded-[28px] border border-line/60 bg-[linear-gradient(180deg,rgba(255,250,252,1),rgba(255,255,255,1))] px-4 py-4 md:flex-row md:items-center md:justify-between"
                          key={reminder.id}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: course?.color ?? "#f75f98" }} />
                              <p className="font-semibold text-ink">{reminder.title}</p>
                            </div>
                            <p className="text-sm text-ink/60">
                              {formatLongDate(reminder.dueDate)}
                              {course ? ` • ${course.name}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 self-start md:self-center">
                            <Tag tone="lavender">{activityLabel(reminder.kind)}</Tag>
                            <Tag tone="peach">+{reminder.points} pts</Tag>
                            <button
                              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line/70 bg-white text-ink/50 transition hover:text-rose"
                              onClick={() => void deleteReminder(reminder.id)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      actionLabel="Add reminder"
                      onAction={openReminderModal}
                      text="Create time-sensitive reminders for exams, homework, or labs."
                      title="No urgent reminders yet"
                    />
                  )}
                </div>
              ) : (
                <p className="mt-5 rounded-[24px] border border-dashed border-line/70 bg-shell px-4 py-4 text-sm text-ink/60">
                  Reminder stack is tucked away for now. Open it anytime when deadlines start stacking up.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <StatCard
                accent="bg-[linear-gradient(135deg,rgba(255,191,95,0.22),rgba(255,245,225,1))]"
                icon={<Star className="h-5 w-5 text-[#f39c12]" />}
                subtitle="Keep it up"
                title={`${totalPoints}`}
              >
                Total points from reminders and completed planner work.
              </StatCard>

              <div className="rounded-shell border border-line/60 bg-white/90 p-5 shadow-card backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-mint p-2 text-[#3ca06b]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-ink">Today&apos;s Plan</h3>
                    <p className="text-sm text-ink/60">Quick status updates for what matters today.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {todayActivities.length ? (
                    todayActivities.map((activity) => {
                      const course = activity.courseId ? courseById[activity.courseId] : undefined;
                      return (
                        <div className="rounded-[24px] border border-line/60 bg-shell px-4 py-4" key={activity.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ink">{activity.title}</p>
                              <p className="mt-1 text-xs text-ink/55">
                                {activity.timeLabel || "Anytime"}
                                {course ? ` • ${course.name}` : ""}
                              </p>
                            </div>
                            <StatusSelect activity={activity} onChange={updateActivityStatus} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      actionLabel="Add activity"
                      onAction={() => openActivityModal(todayValue)}
                      text="Your day is open. Add an exam, homework, study block, or lab to stay grounded."
                      title="Nothing scheduled for today"
                    />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-shell border border-line/60 bg-white/90 p-5 shadow-card backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-white text-ink/70 transition hover:border-rose/40 hover:text-rose"
                  onClick={() => shiftMonth(-1)}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-ink">{formatMonthTitle(selectedMonth)}</h2>
                  <p className="text-sm text-ink/60">Monthly planner view with quick jumping across the full year.</p>
                </div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-white text-ink/70 transition hover:border-rose/40 hover:text-rose"
                  onClick={() => shiftMonth(1)}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  className="rounded-2xl border border-line/70 bg-shell px-4 py-2 text-sm font-semibold text-ink/70 transition hover:border-rose/40 hover:text-rose"
                  onClick={() => setSelectedMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                  type="button"
                >
                  Today
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 rounded-2xl border border-line/70 bg-shell px-3 py-2 text-sm">
                  <span className="font-medium text-ink/70">Year</span>
                  <select
                    className="bg-transparent font-semibold text-ink outline-none"
                    onChange={(event) => selectYear(Number(event.target.value))}
                    value={selectedMonth.getFullYear()}
                  >
                    {Array.from({ length: 5 }, (_, index) => selectedMonth.getFullYear() - 2 + index).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-line/70 bg-shell px-3 py-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-rose" />
                  <select
                    className="bg-transparent font-semibold text-ink outline-none"
                    onChange={(event) => setCourseFilter(event.target.value)}
                    value={courseFilter}
                  >
                    <option value="all">All Courses</option>
                    {planner.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose/20 transition hover:bg-rose-dark"
                  onClick={() => openActivityModal()}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Add Activity
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {planner.courses.map((course) => (
                <button
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                    selectedCourseId === course.id ? "border-transparent text-white shadow-lg" : "border-line/70 bg-white text-ink/70 hover:border-rose/30"
                  )}
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  style={
                    selectedCourseId === course.id
                      ? { backgroundColor: course.color, boxShadow: `0 12px 30px ${tintedColor(course.color, 0.3)}` }
                      : undefined
                  }
                  type="button"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current opacity-70" />
                  {course.name}
                </button>
              ))}
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-line/80 bg-shell px-3 py-2 text-sm font-semibold text-ink/60 transition hover:border-rose/40 hover:text-rose"
                onClick={() => openCourseModal()}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add Course
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-12">
              {Array.from({ length: 12 }, (_, index) => new Date(selectedMonth.getFullYear(), index, 1)).map((monthDate) => (
                <button
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-sm font-medium transition",
                    monthDate.getMonth() === selectedMonth.getMonth()
                      ? "border-transparent text-white shadow-lg"
                      : "border-line/70 bg-shell text-ink/60 hover:border-rose/30"
                  )}
                  key={monthDate.getMonth()}
                  onClick={() => selectMonthIndex(monthDate.getMonth())}
                  style={
                    monthDate.getMonth() === selectedMonth.getMonth()
                      ? {
                          background: "linear-gradient(135deg, rgba(247,95,152,0.95), rgba(156,116,230,0.92))"
                        }
                      : undefined
                  }
                  type="button"
                >
                  {monthDate.toLocaleString("en-US", { month: "short" })}
                </button>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-[32px] border border-line/70">
              <div className="grid grid-cols-7 bg-shell text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div className="border-b border-line/70 px-4 py-3" key={day}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-white">
                {monthDays.map((day) => {
                  const dayValue = toDateInputValue(day);
                  const dayActivities = monthActivities.filter((activity) => activity.scheduledFor === dayValue);
                  const inMonth = day.getMonth() === selectedMonth.getMonth();
                  const isToday = isSameDate(dayValue, todayValue);

                  return (
                    <button
                      className={cx(
                        "min-h-[152px] border-b border-r border-line/50 p-3 text-left align-top transition hover:bg-shell/75",
                        !inMonth && "bg-shell/45 text-ink/35"
                      )}
                      key={dayValue}
                      onClick={() => openActivityModal(dayValue)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cx(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                            isToday ? "bg-rose text-white shadow-lg shadow-rose/20" : "text-ink/70"
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {dayActivities.length > 0 && (
                          <span className="rounded-full bg-shell px-2 py-1 text-[11px] font-semibold text-ink/50">
                            {dayActivities.length} item{dayActivities.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {dayActivities.slice(0, 3).map((activity) => {
                          const course = activity.courseId ? courseById[activity.courseId] : undefined;
                          const color = course?.color ?? "#f75f98";
                          return (
                            <div
                              className="rounded-2xl px-3 py-2 text-xs font-semibold shadow-sm"
                              key={activity.id}
                              style={{
                                backgroundColor: tintedColor(color, 0.18),
                                color,
                                border: `1px solid ${tintedColor(color, 0.25)}`
                              }}
                            >
                              <p className="truncate">{activity.title}</p>
                              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] opacity-70">{activityLabel(activity.kind)}</p>
                            </div>
                          );
                        })}
                        {dayActivities.length > 3 && (
                          <div className="text-xs font-medium text-rose-dark">+{dayActivities.length - 3} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-shell border border-line/60 bg-white/90 p-5 shadow-card backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: selectedCourse?.color ?? "#f75f98" }}
                  />
                  <h2 className="text-xl font-semibold text-ink">{selectedCourse?.name ?? "Course Notes & Links"}</h2>
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {selectedCourse
                    ? `${selectedCourse.instructor || "Instructor TBD"} • Keep notes, context, and links together.`
                    : "Add a course to start capturing notes and helpful links."}
                </p>
              </div>
              {selectedCourse && (
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-white text-ink/60 transition hover:border-rose/40 hover:text-rose"
                  onClick={() => openCourseModal(selectedCourse)}
                  type="button"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
              )}
            </div>

            {selectedCourse ? (
              <>
                <div className="mt-4 rounded-[26px] border border-line/60 bg-shell px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">Description</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{selectedCourse.description || "Add a course description for instructor notes or class context."}</p>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Notes</p>
                      <p className="text-xs text-ink/55">Editable notes for exams, lecture takeaways, or prep steps.</p>
                    </div>
                    <button
                      className="rounded-2xl bg-rose px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-dark disabled:opacity-60"
                      disabled={savingNotes}
                      onClick={() => void saveSelectedCourseNotes()}
                      type="button"
                    >
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                  <textarea
                    className="mt-3 min-h-[132px] w-full rounded-[26px] border border-line/70 bg-white px-4 py-4 text-sm text-ink outline-none transition focus:border-rose/40"
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Capture reminders, lecture patterns, study tips, or clinical prep notes."
                    value={notesDraft}
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">Links</p>
                      <p className="text-xs text-ink/55">Each link includes a label and description so it stays meaningful.</p>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-2xl border border-line/70 bg-shell px-3 py-2 text-xs font-semibold text-rose-dark transition hover:border-rose/40"
                      onClick={openLinkModal}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add Link
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {selectedCourseLinks.length ? (
                      selectedCourseLinks.map((link) => (
                        <div className="rounded-[26px] border border-line/60 bg-white px-4 py-4" key={link.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ink">{link.label}</p>
                              <p className="mt-1 text-sm text-ink/60">{link.description || "No description yet."}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line/70 bg-shell text-rose transition hover:border-rose/40"
                                href={link.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line/70 bg-shell text-ink/45 transition hover:text-rose"
                                onClick={() => void deleteLink(link.id)}
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 truncate text-xs text-rose-dark">{link.url}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        actionLabel="Add course link"
                        onAction={openLinkModal}
                        text="Store study guides, portals, and references with a description so you know why each link matters."
                        title="No links for this course yet"
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                actionLabel="Add course"
                onAction={() => openCourseModal()}
                text="Courses drive color coding, instructor details, and notes throughout the planner."
                title="No course selected"
              />
            )}
          </section>

          <section className="rounded-shell border border-line/60 bg-white/90 p-5 shadow-card backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-ink">My Activities (Non-School)</h2>
                <p className="mt-1 text-sm text-ink/60">A separate side section for life outside class.</p>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(156,116,230,1),rgba(247,95,152,1))] text-white shadow-lg shadow-rose/20 transition hover:opacity-90"
                onClick={openLifeModal}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {sortedLifeItems.length ? (
                sortedLifeItems.map((item) => (
                  <div className="rounded-[26px] border border-line/60 bg-white px-4 py-4" key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-shell text-lg text-rose-dark">
                          {getCategoryGlyph(item.category || item.title)}
                        </span>
                        <div>
                          <p className="font-semibold text-ink">{item.title}</p>
                          <p className="mt-1 text-sm text-ink/60">
                            {formatFriendlyDate(item.scheduledFor)} • {item.timeLabel || "Anytime"}
                          </p>
                          <p className="mt-2 text-xs text-ink/55">{item.description || "No extra notes yet."}</p>
                        </div>
                      </div>
                      <button
                        className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line/70 bg-shell text-ink/45 transition hover:text-rose"
                        onClick={() => void deleteLifeItem(item.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  actionLabel="Add life activity"
                  onAction={openLifeModal}
                  text="Keep personal plans visible without mixing them into your course calendar."
                  title="Nothing outside school yet"
                />
              )}
            </div>
          </section>
        </aside>
      </div>

      <ModalShell onClose={() => setActiveModal(null)} open={activeModal === "course"} title={courseDraft.id ? "Edit Course" : "Add New Course"}>
        <form className="space-y-4" onSubmit={(event) => void submitCourse(event)}>
          <Field label="Course Name">
            <input
              className="input-shell"
              onChange={(event) => setCourseDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Fundamentals of Nursing"
              value={courseDraft.name}
            />
          </Field>
          <Field label="Instructor">
            <input
              className="input-shell"
              onChange={(event) => setCourseDraft((current) => ({ ...current, instructor: event.target.value }))}
              placeholder="Prof. Sarah Johnson"
              value={courseDraft.instructor}
            />
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap gap-3">
              {coursePalette.map((color) => (
                <button
                  className={cx(
                    "h-10 w-10 rounded-full border-2 transition",
                    courseDraft.color === color ? "border-ink shadow-lg" : "border-transparent"
                  )}
                  key={color}
                  onClick={() => setCourseDraft((current) => ({ ...current, color }))}
                  style={{ backgroundColor: color }}
                  type="button"
                >
                  <span className="sr-only">Select {color}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Description">
            <textarea
              className="input-shell min-h-[110px]"
              onChange={(event) => setCourseDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Intro notes, instructor style, or class context."
              value={courseDraft.description}
            />
          </Field>
          <Field label="Starter Notes">
            <textarea
              className="input-shell min-h-[110px]"
              onChange={(event) => setCourseDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Any notes you already want attached to this course."
              value={courseDraft.notes}
            />
          </Field>
          <button className="w-full rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-dark" type="submit">
            {courseDraft.id ? "Save Course Changes" : "Add Course"}
          </button>
        </form>
      </ModalShell>

      <ModalShell onClose={() => setActiveModal(null)} open={activeModal === "activity"} title="Add Activity">
        <form className="space-y-4" onSubmit={(event) => void submitActivity(event)}>
          <Field label="Title">
            <input
              className="input-shell"
              onChange={(event) => setActivityDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Pharmacology Exam"
              value={activityDraft.title}
            />
          </Field>
          <Field label="Course">
            <select
              className="input-shell"
              onChange={(event) => setActivityDraft((current) => ({ ...current, courseId: event.target.value }))}
              value={activityDraft.courseId}
            >
              <option value="">No course</option>
              {planner.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {activityKindOptions.map((option) => (
                <button
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                    activityDraft.kind === option.value ? "border-transparent bg-rose text-white" : "border-line/70 bg-white text-ink/65 hover:border-rose/30"
                  )}
                  key={option.value}
                  onClick={() => setActivityDraft((current) => ({ ...current, kind: option.value }))}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input
                className="input-shell"
                onChange={(event) => setActivityDraft((current) => ({ ...current, scheduledFor: event.target.value }))}
                type="date"
                value={activityDraft.scheduledFor}
              />
            </Field>
            <Field label="Time">
              <input
                className="input-shell"
                onChange={(event) => setActivityDraft((current) => ({ ...current, timeLabel: event.target.value }))}
                placeholder="8:00 AM"
                value={activityDraft.timeLabel}
              />
            </Field>
          </div>
          <Field label="Status">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {activityStatusOptions.map((option) => (
                <button
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                    activityDraft.status === option.value ? "border-transparent bg-ink text-white" : "border-line/70 bg-white text-ink/65 hover:border-rose/30"
                  )}
                  key={option.value}
                  onClick={() => setActivityDraft((current) => ({ ...current, status: option.value }))}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Description">
            <textarea
              className="input-shell min-h-[110px]"
              onChange={(event) => setActivityDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="What needs to happen for this activity?"
              value={activityDraft.description}
            />
          </Field>
          <button className="w-full rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-dark" type="submit">
            Add Activity
          </button>
        </form>
      </ModalShell>

      <ModalShell onClose={() => setActiveModal(null)} open={activeModal === "reminder"} title="Add Urgent Reminder">
        <form className="space-y-4" onSubmit={(event) => void submitReminder(event)}>
          <Field label="Title">
            <input
              className="input-shell"
              onChange={(event) => setReminderDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Lab Report - IV Therapy"
              value={reminderDraft.title}
            />
          </Field>
          <Field label="Course">
            <select
              className="input-shell"
              onChange={(event) => setReminderDraft((current) => ({ ...current, courseId: event.target.value }))}
              value={reminderDraft.courseId}
            >
              <option value="">No course</option>
              {planner.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {activityKindOptions.map((option) => (
                <button
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                    reminderDraft.kind === option.value ? "border-transparent bg-rose text-white" : "border-line/70 bg-white text-ink/65 hover:border-rose/30"
                  )}
                  key={option.value}
                  onClick={() => setReminderDraft((current) => ({ ...current, kind: option.value }))}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due Date">
              <input
                className="input-shell"
                onChange={(event) => setReminderDraft((current) => ({ ...current, dueDate: event.target.value }))}
                type="date"
                value={reminderDraft.dueDate}
              />
            </Field>
            <Field label="Points">
              <input
                className="input-shell"
                min="0"
                onChange={(event) => setReminderDraft((current) => ({ ...current, points: event.target.value }))}
                placeholder="10"
                type="number"
                value={reminderDraft.points}
              />
            </Field>
          </div>
          <button className="w-full rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-dark" type="submit">
            Add Reminder
          </button>
        </form>
      </ModalShell>

      <ModalShell onClose={() => setActiveModal(null)} open={activeModal === "link"} title="Add Course Link">
        <form className="space-y-4" onSubmit={(event) => void submitLink(event)}>
          <Field label="Course">
            <select
              className="input-shell"
              onChange={(event) => setLinkDraft((current) => ({ ...current, courseId: event.target.value }))}
              value={linkDraft.courseId}
            >
              {planner.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Link Label">
            <input
              className="input-shell"
              onChange={(event) => setLinkDraft((current) => ({ ...current, label: event.target.value }))}
              placeholder="ATI Pharmacology Practice"
              value={linkDraft.label}
            />
          </Field>
          <Field label="URL">
            <input
              className="input-shell"
              onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))}
              placeholder="https://..."
              type="url"
              value={linkDraft.url}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input-shell min-h-[110px]"
              onChange={(event) => setLinkDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Practice questions, lecture companion, study resource..."
              value={linkDraft.description}
            />
          </Field>
          <button className="w-full rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-dark" type="submit">
            Save Link
          </button>
        </form>
      </ModalShell>

      <ModalShell onClose={() => setActiveModal(null)} open={activeModal === "life"} title="Add Non-School Activity">
        <form className="space-y-4" onSubmit={(event) => void submitLifeItem(event)}>
          <Field label="Title">
            <input
              className="input-shell"
              onChange={(event) => setLifeDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Lunch with Mia"
              value={lifeDraft.title}
            />
          </Field>
          <Field label="Category">
            <input
              className="input-shell"
              onChange={(event) => setLifeDraft((current) => ({ ...current, category: event.target.value }))}
              placeholder="Gym, Grocery, Volunteer..."
              value={lifeDraft.category}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <input
                className="input-shell"
                onChange={(event) => setLifeDraft((current) => ({ ...current, scheduledFor: event.target.value }))}
                type="date"
                value={lifeDraft.scheduledFor}
              />
            </Field>
            <Field label="Time">
              <input
                className="input-shell"
                onChange={(event) => setLifeDraft((current) => ({ ...current, timeLabel: event.target.value }))}
                placeholder="1:00 PM"
                value={lifeDraft.timeLabel}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="input-shell min-h-[110px]"
              onChange={(event) => setLifeDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Keep personal context here."
              value={lifeDraft.description}
            />
          </Field>
          <button className="w-full rounded-2xl bg-rose px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-dark" type="submit">
            Add Activity
          </button>
        </form>
      </ModalShell>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink/75">{label}</span>
      {children}
    </label>
  );
}

function ModalShell({
  children,
  onClose,
  open,
  title
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[34px] border border-line/70 bg-white p-6 shadow-[0_24px_80px_rgba(60,24,45,0.18)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-ink">{title}</h3>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/70 bg-shell text-ink/60 transition hover:border-rose/40 hover:text-rose"
            onClick={onClose}
            type="button"
          >
            <ChevronDown className="h-4 w-4 rotate-45" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone: "peach" | "lavender" }) {
  return (
    <span
      className={cx(
        "rounded-full px-3 py-1 text-xs font-semibold",
        tone === "lavender" ? "bg-lavender text-[#7a52b2]" : "bg-peach text-rose-dark"
      )}
    >
      {children}
    </span>
  );
}

function EmptyState({
  actionLabel,
  onAction,
  text,
  title
}: {
  actionLabel: string;
  onAction: () => void;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-line/80 bg-shell px-4 py-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose shadow-sm">
        <NotebookPen className="h-5 w-5" />
      </div>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/58">{text}</p>
      <button
        className="mt-4 rounded-2xl border border-line/70 bg-white px-4 py-2 text-sm font-semibold text-rose-dark transition hover:border-rose/40"
        onClick={onAction}
        type="button"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function StatCard({
  accent,
  children,
  icon,
  subtitle,
  title
}: {
  accent: string;
  children: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="rounded-shell border border-line/60 bg-white/90 p-5 shadow-card backdrop-blur">
      <div className={cx("inline-flex rounded-2xl p-3", accent)}>{icon}</div>
      <div className="mt-4 flex items-end gap-3">
        <p className="text-4xl font-semibold text-ink">{title}</p>
        <p className="pb-1 text-sm font-semibold text-rose-dark">{subtitle}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/60">{children}</p>
    </div>
  );
}

function StatusSelect({
  activity,
  onChange
}: {
  activity: Activity;
  onChange: (activityId: string, status: Activity["status"]) => Promise<void>;
}) {
  const tone =
    activity.status === "done" ? "bg-mint text-[#348a57]" : activity.status === "in_progress" ? "bg-lavender text-[#7a52b2]" : "bg-peach text-rose-dark";

  return (
    <select
      className={cx("rounded-2xl border border-transparent px-3 py-2 text-xs font-semibold outline-none", tone)}
      onChange={(event) => void onChange(activity.id, event.target.value as Activity["status"])}
      value={activity.status}
    >
      {activityStatusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function renderNavGlyph(index: number) {
  switch (index) {
    case 0:
      return <Sparkles className="h-4 w-4" />;
    case 1:
      return <CalendarDays className="h-4 w-4" />;
    case 2:
      return <BookOpenText className="h-4 w-4" />;
    case 3:
      return <ClipboardList className="h-4 w-4" />;
    case 4:
      return <Link2 className="h-4 w-4" />;
    case 5:
      return <ArrowUpRight className="h-4 w-4" />;
    default:
      return <CircleDashed className="h-4 w-4" />;
  }
}

function createCourseDraft(): CourseDraft {
  return {
    id: null,
    name: "",
    instructor: "",
    color: coursePalette[0],
    description: "",
    notes: ""
  };
}

function createActivityDraft(courseId = "", dateValue = toDateInputValue(new Date())): ActivityDraft {
  return {
    title: "",
    courseId,
    kind: "exam",
    status: "in_progress",
    scheduledFor: dateValue,
    timeLabel: "",
    description: ""
  };
}

function createReminderDraft(courseId = "", dateValue = toDateInputValue(new Date())): ReminderDraft {
  return {
    title: "",
    courseId,
    kind: "exam",
    dueDate: dateValue,
    points: "5"
  };
}

function createLinkDraft(courseId = ""): LinkDraft {
  return {
    courseId,
    label: "",
    url: "",
    description: ""
  };
}

function createLifeDraft(dateValue = toDateInputValue(new Date())): LifeDraft {
  return {
    title: "",
    category: "",
    scheduledFor: dateValue,
    timeLabel: "",
    description: ""
  };
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function mapCourseRow(row: Database["public"]["Tables"]["courses"]["Row"]): Course {
  return {
    id: row.id,
    name: row.name,
    instructor: row.instructor ?? "",
    color: row.color,
    description: row.description ?? "",
    notes: row.notes ?? ""
  };
}

function mapCourseLinkRow(row: Database["public"]["Tables"]["course_links"]["Row"]): CourseLink {
  return {
    id: row.id,
    courseId: row.course_id,
    label: row.label,
    url: row.url,
    description: row.description ?? ""
  };
}

function mapActivityRow(row: Database["public"]["Tables"]["activities"]["Row"]): Activity {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    kind: row.kind,
    status: row.status,
    scheduledFor: row.scheduled_for,
    timeLabel: row.time_label ?? "",
    description: row.description ?? ""
  };
}

function mapReminderRow(row: Database["public"]["Tables"]["reminders"]["Row"]): Reminder {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    kind: row.kind,
    dueDate: row.due_date,
    points: row.points
  };
}

function mapLifeRow(row: Database["public"]["Tables"]["non_school_items"]["Row"]): NonSchoolItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? "",
    scheduledFor: row.scheduled_for,
    timeLabel: row.time_label ?? "",
    description: row.description ?? ""
  };
}
