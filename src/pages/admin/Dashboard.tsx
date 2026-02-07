import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, School, ClipboardCheck, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [studentsRes, classroomsRes, todayAttendanceRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('is_archived', false),
        supabase.from('classrooms').select('id', { count: 'exact' }),
        supabase.from('attendance').select('id, is_present').eq('date', today),
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

  // Fetch classrooms with today's attendance status
  const { data: classroomStatus, isLoading: isLoadingClassrooms } = useQuery({
    queryKey: ['classroom-attendance-status', today],
    queryFn: async () => {
      // Get all classrooms
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id, name')
        .order('name');

      // Get today's attendance grouped by student's classroom
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('student_id, is_present, student:students(classroom_id)')
        .eq('date', today);

      // Get student count per classroom
      const { data: students } = await supabase
        .from('students')
        .select('classroom_id')
        .eq('is_archived', false);

      // Build classroom status map
      const classroomMap = new Map<string, {
        id: string;
        name: string;
        totalStudents: number;
        presentCount: number;
        absentCount: number;
        hasAttendance: boolean;
      }>();

      classrooms?.forEach(c => {
        classroomMap.set(c.id, {
          id: c.id,
          name: c.name,
          totalStudents: 0,
          presentCount: 0,
          absentCount: 0,
          hasAttendance: false,
        });
      });

      // Count students per classroom
      students?.forEach(s => {
        if (s.classroom_id && classroomMap.has(s.classroom_id)) {
          const classroom = classroomMap.get(s.classroom_id)!;
          classroom.totalStudents++;
        }
      });

      // Count attendance per classroom
      todayAttendance?.forEach((record: any) => {
        const classroomId = record.student?.classroom_id;
        if (classroomId && classroomMap.has(classroomId)) {
          const classroom = classroomMap.get(classroomId)!;
          classroom.hasAttendance = true;
          if (record.is_present) {
            classroom.presentCount++;
          } else {
            classroom.absentCount++;
          }
        }
      });

      return Array.from(classroomMap.values());
    },
  });

  const classroomsWithAttendance = classroomStatus?.filter(c => c.hasAttendance) || [];
  const classroomsWithoutAttendance = classroomStatus?.filter(c => !c.hasAttendance) || [];

  return (
    <AdminLayout title="Painel" description="Visão geral da frequência da escola">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalStudents}</div>
            )}
            <p className="text-xs text-muted-foreground">Alunos ativos matriculados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salas de Aula</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalClassrooms}</div>
            )}
            <p className="text-xs text-muted-foreground">Salas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presentes Hoje</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.presentToday}</div>
            )}
            <p className="text-xs text-muted-foreground">Alunos presentes hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Presença</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.attendanceRate}%</div>
            )}
            <p className="text-xs text-muted-foreground">Frequência de hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom Status Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Classrooms WITH Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Salas com Chamada Hoje
            </CardTitle>
            <CardDescription>
              {classroomsWithAttendance.length} sala(s) com frequência registrada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingClassrooms ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : classroomsWithAttendance.length > 0 ? (
              <div className="space-y-3">
                {classroomsWithAttendance.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  >
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-300">
                        {classroom.name}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {classroom.totalStudents} aluno(s) na sala
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="default" className="bg-green-600">
                        {classroom.presentCount} Presentes
                      </Badge>
                      {classroom.absentCount > 0 && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {classroom.absentCount} Ausentes
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhuma sala com chamada registrada hoje</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classrooms WITHOUT Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              Salas sem Chamada Hoje
            </CardTitle>
            <CardDescription>
              {classroomsWithoutAttendance.length} sala(s) pendente(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingClassrooms ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : classroomsWithoutAttendance.length > 0 ? (
              <div className="space-y-3">
                {classroomsWithoutAttendance.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                  >
                    <div>
                      <p className="font-semibold text-orange-800 dark:text-orange-300">
                        {classroom.name}
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        {classroom.totalStudents} aluno(s) na sala
                      </p>
                    </div>
                    <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400">
                      Pendente
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="text-green-600 dark:text-green-400 font-medium">
                  Todas as salas com chamada! 🎉
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
