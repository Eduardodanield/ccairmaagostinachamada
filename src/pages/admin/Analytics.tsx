import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const COLORS = ['hsl(217, 91%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function AdminAnalytics() {
  const { data: attendanceByClassroom, isLoading: isLoadingClassroom } = useQuery({
    queryKey: ['analytics-by-classroom'],
    queryFn: async () => {
      const { data: classrooms } = await supabase.from('classrooms').select('id, name');
      const { data: attendance } = await supabase
        .from('attendance')
        .select('is_present, student:students(classroom_id)')
        .gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      if (!classrooms || !attendance) return [];

      return classrooms.map((classroom) => {
        const classroomAttendance = attendance.filter(
          (a: any) => a.student?.classroom_id === classroom.id
        );
        const present = classroomAttendance.filter((a: any) => a.is_present).length;
        const total = classroomAttendance.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          name: classroom.name,
          rate,
          present,
          absent: total - present,
        };
      });
    },
  });

  const { data: weeklyTrend, isLoading: isLoadingTrend } = useQuery({
    queryKey: ['analytics-weekly-trend'],
    queryFn: async () => {
      const days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const { data: attendance } = await supabase
        .from('attendance')
        .select('date, is_present')
        .gte('date', format(subDays(new Date(), 6), 'yyyy-MM-dd'));

      return days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayAttendance = attendance?.filter((a) => a.date === dateStr) || [];
        const present = dayAttendance.filter((a) => a.is_present).length;
        const total = dayAttendance.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          day: format(day, 'EEE'),
          date: format(day, 'MMM d'),
          rate,
          present,
          total,
        };
      });
    },
  });

  const { data: overallStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['analytics-overall'],
    queryFn: async () => {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('is_present')
        .gte('date', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      const present = attendance?.filter((a) => a.is_present).length || 0;
      const absent = (attendance?.length || 0) - present;

      return [
        { name: 'Present', value: present },
        { name: 'Absent', value: absent },
      ];
    },
  });

  return (
    <AdminLayout title="Analytics" description="Attendance insights and trends">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Trend */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
            <CardDescription>Attendance rate over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrend ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Attendance Rate']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(217, 91%, 50%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(217, 91%, 50%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Attendance by Classroom */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance by Classroom</CardTitle>
            <CardDescription>Last 30 days comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingClassroom ? (
              <Skeleton className="h-[300px] w-full" />
            ) : attendanceByClassroom && attendanceByClassroom.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceByClassroom} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Rate']}
                  />
                  <Bar dataKey="rate" fill="hsl(217, 91%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overall Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Distribution</CardTitle>
            <CardDescription>Present vs Absent (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-[300px] w-full" />
            ) : overallStats && overallStats.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={overallStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {overallStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No attendance data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
