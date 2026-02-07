import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherLayout } from '@/components/layouts/TeacherLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export default function TeacherStats() {
  const { user } = useAuth();

  const { data: recentRecords, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['my-recent-attendance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          is_present,
          student:students(
            name,
            classroom:classrooms(name)
          )
        `)
        .eq('recorded_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: weeklyStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['my-weekly-stats', user?.id],
    queryFn: async () => {
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance')
        .select('id, is_present')
        .eq('recorded_by', user?.id)
        .gte('date', weekStart)
        .lte('date', weekEnd);
      
      if (error) throw error;

      const total = data?.length || 0;
      const present = data?.filter((a) => a.is_present).length || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return { total, present, absent: total - present, rate };
    },
    enabled: !!user?.id,
  });

  return (
    <TeacherLayout title="My Stats">
      <div className="p-4">
        {/* Weekly Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>This Week</CardTitle>
            <CardDescription>Your attendance recording summary</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : weeklyStats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{weeklyStats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{weeklyStats.rate}%</p>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                </div>
                <div className="p-4 rounded-lg bg-success/10">
                  <p className="text-2xl font-bold text-success">
                    {weeklyStats.present}
                  </p>
                  <p className="text-sm text-success/80">Present</p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10">
                  <p className="text-2xl font-bold text-destructive">
                    {weeklyStats.absent}
                  </p>
                  <p className="text-sm text-destructive/80">Absent</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No records this week yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Records */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
            <CardDescription>Attendance you've recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : recentRecords && recentRecords.length > 0 ? (
              <div className="space-y-3">
                {recentRecords.map((record: any) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{record.student?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.student?.classroom?.name} • {format(new Date(record.date), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant={record.is_present ? 'default' : 'secondary'}>
                      {record.is_present ? 'Present' : 'Absent'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No attendance records yet. Start by taking attendance for a class.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
