import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherLayout } from '@/components/layouts/TeacherLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TeacherHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['teacher-classrooms-with-status', today, user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get assigned classroom IDs for this teacher
      const { data: assignments, error: assignError } = await supabase
        .from('teacher_classrooms')
        .select('classroom_id')
        .eq('teacher_id', user.id);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const classroomIds = assignments.map(a => a.classroom_id);

      const { data: classroomsData, error: classroomsError } = await supabase
        .from('classrooms')
        .select('*')
        .in('id', classroomIds)
        .order('name');
      
      if (classroomsError) throw classroomsError;

      const results = await Promise.all(
        classroomsData.map(async (classroom) => {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('classroom_id', classroom.id)
            .eq('is_archived', false);

          const studentIds = students?.map((s) => s.id) || [];
          
          let attendanceCount = 0;
          if (studentIds.length > 0) {
            const { count } = await supabase
              .from('attendance')
              .select('id', { count: 'exact' })
              .in('student_id', studentIds)
              .eq('date', today);
            attendanceCount = count || 0;
          }

          const isComplete = studentIds.length > 0 && attendanceCount === studentIds.length;

          return {
            ...classroom,
            studentCount: studentIds.length,
            attendanceCount,
            isComplete,
          };
        })
      );

      return results;
    },
    enabled: !!user,
  });

  const handleSelectClass = (classroomId: string) => {
    navigate(`/teacher/attendance/${classroomId}`);
  };

  return (
    <TeacherLayout title="Minha Sala">
      <div className="p-4">
        <p className="text-muted-foreground mb-4">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : classrooms && classrooms.length > 0 ? (
          <div className="space-y-4">
            {classrooms.map((classroom) => (
              <Card
                key={classroom.id}
                className="cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
                onClick={() => handleSelectClass(classroom.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{classroom.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3" />
                      {classroom.studentCount} alunos
                    </CardDescription>
                  </div>
                  {classroom.studentCount > 0 && (
                    <Badge
                      variant={classroom.isComplete ? 'default' : 'secondary'}
                      className={classroom.isComplete ? 'bg-green-500' : ''}
                    >
                      {classroom.isComplete ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {classroom.attendanceCount}/{classroom.studentCount}
                        </span>
                      )}
                    </Badge>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                Nenhuma sala atribuída. Entre em contato com o administrador para ser designado a uma sala.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
