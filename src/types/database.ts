// Custom types for the School Attendance App

export type AppRole = 'director' | 'teacher';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Classroom {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  classroom_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  classroom?: Classroom;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  arrival_time: string | null;
  is_present: boolean;
  hours_attended: number;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  recorder?: Profile;
}

export interface AttendanceFormData {
  student_id: string;
  is_present: boolean;
  arrival_time?: string;
}
