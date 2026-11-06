import "server-only"
import { googleApiFetch } from "./googleAuth"

export interface CreateCourseWorkOptions {
  courseId: string
  title: string
  description?: string
  maxPoints?: number
  dueYear?: number
  dueMonth?: number
  dueDay?: number
  dueHour?: number
  dueMinute?: number
}

export interface CreateAnnouncementOptions {
  courseId: string
  text: string
}

/**
 * Lists all active Google Classroom courses the user is enrolled in or teaching.
 */
export async function listClassroomCourses(userId: string) {
  const url = "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20"
  const res = await googleApiFetch(userId, url)

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Classroom API error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const courses = (data.courses || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    section: c.section || "",
    descriptionHeading: c.descriptionHeading || "",
    room: c.room || "",
    enrollmentCode: c.enrollmentCode || "",
    alternateLink: c.alternateLink,
    courseState: c.courseState,
  }))

  return {
    courses,
    total: courses.length,
  }
}

/**
 * Lists assignments, questions, and coursework for a specific course.
 */
export async function listCourseWork(userId: string, courseId: string) {
  const url = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork?pageSize=20`
  const res = await googleApiFetch(userId, url)

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to fetch coursework (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const items = (data.courseWork || []).map((cw: any) => ({
    id: cw.id,
    title: cw.title,
    description: cw.description || "",
    state: cw.state,
    workType: cw.workType,
    maxPoints: cw.maxPoints,
    dueDate: cw.dueDate ? `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2, "0")}-${String(cw.dueDate.day).padStart(2, "0")}` : null,
    alternateLink: cw.alternateLink,
  }))

  return {
    courseId,
    courseWork: items,
    total: items.length,
  }
}

/**
 * Creates and publishes a new assignment or coursework item in a Google Classroom course.
 */
export async function createCourseWork(userId: string, opts: CreateCourseWorkOptions) {
  const payload: any = {
    title: opts.title,
    description: opts.description || "",
    workType: "ASSIGNMENT",
    state: "PUBLISHED",
  }

  if (opts.maxPoints !== undefined) {
    payload.maxPoints = opts.maxPoints
  }

  if (opts.dueYear && opts.dueMonth && opts.dueDay) {
    payload.dueDate = {
      year: opts.dueYear,
      month: opts.dueMonth,
      day: opts.dueDay,
    }
    payload.dueTime = {
      hours: opts.dueHour !== undefined ? opts.dueHour : 23,
      minutes: opts.dueMinute !== undefined ? opts.dueMinute : 59,
    }
  }

  const url = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(opts.courseId)}/courseWork`
  const res = await googleApiFetch(userId, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create coursework (${res.status}): ${errorText}`)
  }

  const created = await res.json()
  return {
    success: true,
    id: created.id,
    title: created.title,
    alternateLink: created.alternateLink,
    state: created.state,
  }
}

/**
 * Lists announcements posted in a Google Classroom course.
 */
export async function listClassAnnouncements(userId: string, courseId: string) {
  const url = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/announcements?pageSize=20`
  const res = await googleApiFetch(userId, url)

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to fetch announcements (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const items = (data.announcements || []).map((a: any) => ({
    id: a.id,
    text: a.text,
    state: a.state,
    alternateLink: a.alternateLink,
    creationTime: a.creationTime,
  }))

  return {
    courseId,
    announcements: items,
    total: items.length,
  }
}

/**
 * Creates and posts an announcement to a Google Classroom course.
 */
export async function createClassAnnouncement(userId: string, opts: CreateAnnouncementOptions) {
  const url = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(opts.courseId)}/announcements`
  const res = await googleApiFetch(userId, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: opts.text,
      state: "PUBLISHED",
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to post announcement (${res.status}): ${errorText}`)
  }

  const created = await res.json()
  return {
    success: true,
    id: created.id,
    text: created.text,
    alternateLink: created.alternateLink,
  }
}

/**
 * Lists all students enrolled in a Google Classroom course.
 */
export async function listCourseStudents(userId: string, courseId: string) {
  const url = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/students?pageSize=50`
  const res = await googleApiFetch(userId, url)

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to fetch students (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const students = (data.students || []).map((s: any) => ({
    userId: s.userId,
    name: s.profile?.name?.fullName || "Student",
    email: s.profile?.emailAddress || "",
  }))

  return {
    courseId,
    students,
    total: students.length,
  }
}

