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
import { ptBR } from 'date-fns/locale';

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
          day: format(day, 'EEE', { locale: ptBR }),
          date: format(day, "d 'de' MMM", { locale: ptBR }),
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
        { name: 'Presentes', value: present },
        { name: 'Ausentes', value: absent },
      ];
    },
  });

  return (
    <AdminLayout title="Relatórios" description="Análises e tendências de frequência">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Trend */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Tendência Semanal de Frequência</CardTitle>
            <CardDescription>Taxa de presença nos últimos 7 dias</CardDescription>
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
                    formatter={(value: number) => [`${value}%`, 'Taxa de Presença']}
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
            <CardTitle>Frequência por Sala</CardTitle>
            <CardDescription>Comparativo dos últimos 30 dias</CardDescription>
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
                    formatter={(value: number) => [`${value}%`, 'Taxa']}
                  />
                  <Bar dataKey="rate" fill="hsl(217, 91%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overall Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Geral</CardTitle>
            <CardDescription>Presentes vs Ausentes (últimos 30 dias)</CardDescription>
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
                Nenhum dado de frequência ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
