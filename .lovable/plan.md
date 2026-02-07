

## School Attendance Web App - Implementation Plan

### Overview
A cloud-based SaaS application with two distinct interfaces: a desktop-optimized Director Dashboard for administration and a mobile-first Teacher Interface for daily attendance taking.

---

### Phase 1: Database Foundation

**Tables to Create:**
1. **user_roles** - Secure role management (director/teacher) separate from profiles
2. **profiles** - User profile data (name, email, linked to auth.users)
3. **classrooms** - Class information (id, name, created_at)
4. **students** - Student records (id, name, age, classroom_id, is_archived, created_at)
5. **attendance** - Daily attendance logs (id, student_id, date, arrival_time, is_present, hours_attended, recorded_by, created_at)

**Security (RLS Policies):**
- Directors: Full CRUD access on all tables
- Teachers: Read-only on students/classrooms, Insert/Read on attendance
- Automatic assignment of fixed hours (configurable, default 8 hours) when marked present

---

### Phase 2: Authentication & Role System

**Features:**
- Email/password login via Supabase Auth
- Automatic profile creation on signup
- Role-based routing (Directors → Admin Dashboard, Teachers → Mobile Interface)
- Protected routes based on user role
- Director ability to invite/create teacher accounts

---

### Phase 3: Director Dashboard (Desktop Optimized)

**Layout:** Sidebar navigation with clean, professional styling

**Pages:**

1. **Dashboard Home**
   - Quick stats cards (total students, today's attendance rate, classes count)
   - Recent attendance activity feed
   - Alerts for low attendance

2. **Student Management**
   - Data table with search, filter by classroom, and pagination
   - Add Student modal (name, age, classroom assignment)
   - Edit Student inline or modal
   - Archive Student (soft delete with confirmation)
   - Bulk actions support

3. **Classroom Management**
   - List/create/edit classrooms
   - View students per classroom

4. **Teacher Management**
   - View all teachers
   - Invite new teacher (sends email invitation)
   - Deactivate teacher accounts

5. **Attendance Overview**
   - Master table of all attendance records
   - Filters: by classroom, by date range, by teacher who recorded
   - Export capabilities

6. **Analytics**
   - Attendance rate charts (line/bar charts using Recharts)
   - Per-classroom breakdown
   - Per-student attendance trends
   - Weekly/monthly comparisons

---

### Phase 4: Teacher Interface (Mobile-First)

**Layout:** Bottom navigation, large touch targets, optimized for phones

**Flow:**

1. **Login Screen**
   - Clean email/password form
   - Remember me option

2. **Class Selection**
   - Grid/list of all classrooms
   - Visual indicator of today's attendance status per class

3. **Take Attendance**
   - Header showing selected class and date
   - List of students (sorted alphabetically)
   - For each student:
     - Large toggle switch (Present/Absent)
     - Time picker for arrival (defaults to current time, only enabled when present)
   - Fixed "Submit Attendance" button at bottom
   - Confirmation dialog before submission

4. **My Stats**
   - Simple view of attendance history for classes they've recorded
   - Weekly summary view

---

### Phase 5: Additional Features

- **Responsive Design:** Director dashboard works on tablets, Teacher interface works on desktop too
- **Toast Notifications:** Feedback for all actions
- **Loading States:** Skeleton loaders for data fetching
- **Error Handling:** User-friendly error messages
- **Data Validation:** Form validation with clear error messages

---

### Design System (Clean & Professional)

- **Color Palette:** Blues and grays with a subtle accent color for actions
- **Typography:** Clear hierarchy, readable fonts
- **Components:** shadcn/ui components for consistency
- **Spacing:** Generous padding for easy touch targets on mobile

