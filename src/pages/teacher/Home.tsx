import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeacherLayout } from '@/components/layouts/TeacherLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Classroom } from '@/types/database';

export default function TeacherHome() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['classrooms-with-status', today],
    queryFn: async () => {
      const { data: classroomsData, error: classroomsError } = await supabase
        .from('classrooms')
        .select('*')
        .order('name');
      
      if (classroomsError) throw classroomsError;

      // Get student counts and today's attendance status for each classroom
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
  });

  const handleSelectClass = (classroomId: string) => {
    navigate(`/teacher/attendance/${classroomId}`);
  };

  return (
    <TeacherLayout title="Select Class">
      <div className="p-4">
        <p className="text-muted-foreground mb-4">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
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
                      {classroom.studentCount} students
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
                          Complete
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
                No classrooms available. Please contact your administrator.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
