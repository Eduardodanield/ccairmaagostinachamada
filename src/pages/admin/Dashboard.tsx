import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, School, ClipboardCheck, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [studentsRes, classroomsRes, todayAttendanceRes, totalStudentsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('is_archived', false),
        supabase.from('classrooms').select('id', { count: 'exact' }),
        supabase.from('attendance').select('id, is_present').eq('date', today),
        supabase.from('students').select('id', { count: 'exact' }).eq('is_archived', false),
      ]);

      const presentToday = todayAttendanceRes.data?.filter(a => a.is_present).length || 0;
      const totalRecords = todayAttendanceRes.data?.length || 0;
      const attendanceRate = totalRecords > 0 ? Math.round((presentToday / totalRecords) * 100) : 0;

      return {
        totalStudents: studentsRes.count || 0,
        totalClassrooms: classroomsRes.count || 0,
        presentToday,
        attendanceRate,
      };
    },
  });

  const { data: recentAttendance, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['recent-attendance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          is_present,
          arrival_time,
          student:students(name, classroom:classrooms(name))
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <AdminLayout title="Dashboard" description="Overview of your school's attendance">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalStudents}</div>
            )}
            <p className="text-xs text-muted-foreground">Active students enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classrooms</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalClassrooms}</div>
            )}
            <p className="text-xs text-muted-foreground">Active classrooms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.presentToday}</div>
            )}
            <p className="text-xs text-muted-foreground">Students present today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.attendanceRate}%</div>
            )}
            <p className="text-xs text-muted-foreground">Today's attendance</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Latest attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRecent ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentAttendance && recentAttendance.length > 0 ? (
            <div className="space-y-4">
              {recentAttendance.map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{record.student?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.student?.classroom?.name} • {format(new Date(record.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.is_present 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {record.is_present ? 'Present' : 'Absent'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No attendance records yet. Start by adding students and taking attendance.
            </p>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
