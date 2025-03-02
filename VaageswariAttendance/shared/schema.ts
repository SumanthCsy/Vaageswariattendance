import { z } from "zod";

export const userRoles = ["student", "admin"] as const;

export const userSchema = z.object({
  id: z.string(),
  role: z.enum(userRoles),
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string(),
});

export const studentSchema = z.object({
  id: z.string().optional(),
  role: z.literal("student"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  rollNumber: z.string().min(1, "Roll number is required"),
  branch: z.string().min(1, "Branch is required"),
  year: z.number().min(1).max(4),
  batch: z.string().min(1, "Batch is required"),
  username: z.string().email("Must be a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  authUid: z.string().optional(),
  createdAt: z.date().optional(),
});

export const attendanceSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  date: z.string(),
  present: z.boolean(),
  semester: z.number(),
});

export const subjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  semester: z.number().min(1).max(8),
  branch: z.string().min(1, "Branch is required"),
});

export const midMarksSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  subjectId: z.string(),
  semester: z.number().min(1).max(8),
  midNumber: z.number().min(1).max(2),
  marks: z.number().min(0),
  maxMarks: z.number().default(30),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Attendance = z.infer<typeof attendanceSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type MidMarks = z.infer<typeof midMarksSchema>;