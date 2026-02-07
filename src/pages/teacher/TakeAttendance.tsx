import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherLayout } from '@/components/layouts/TeacherLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Student, Classroom, AttendanceFormData } from '@/types/database';

interface AttendanceState {
  [studentId: string]: {
    isPresent: boolean;
    arrivalTime: string;
  };
}

export default function TeacherAttendance() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');
  const currentTime = format(new Date(), 'HH:mm');

  const [attendanceState, setAttendanceState] = useState<AttendanceState>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: classroom } = useQuery({
    queryKey: ['classroom', classroomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .single();
      if (error) throw error;
      return data as Classroom;
    },
  });

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['students-for-attendance', classroomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data as Student[];
    },
  });

  const { data: existingAttendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['existing-attendance', classroomId, today],
    queryFn: async () => {
      if (!students) return [];
      const studentIds = students.map((s) => s.id);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .in('student_id', studentIds)
        .eq('date', today);
      if (error) throw error;
      return data;
    },
    enabled: !!students,
  });

  // Initialize attendance state from existing records or defaults
  useEffect(() => {
    if (students && existingAttendance !== undefined) {
      const initialState: AttendanceState = {};
      students.forEach((student) => {
        const existing = existingAttendance?.find((a) => a.student_id === student.id);
        initialState[student.id] = {
          isPresent: existing?.is_present ?? false,
          arrivalTime: existing?.arrival_time?.slice(0, 5) ?? currentTime,
        };
      });
      setAttendanceState(initialState);
    }
  }, [students, existingAttendance, currentTime]);

  const submitMutation = useMutation({
    mutationFn: async (data: AttendanceFormData[]) => {
      // Upsert attendance records
      const records = data.map((item) => ({
        student_id: item.student_id,
        date: today,
        is_present: item.is_present,
        arrival_time: item.is_present && item.arrival_time ? item.arrival_time : null,
        recorded_by: user?.id,
      }));

      const { error } = await supabase.from('attendance').upsert(records, {
        onConflict: 'student_id,date',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms-with-status'] });
      queryClient.invalidateQueries({ queryKey: ['existing-attendance'] });
      toast({ title: 'Frequência registrada com sucesso!' });
      navigate('/teacher');
    },
    onError: (error: Error) => {
      toast({
        title: 'Falha ao registrar frequência',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (studentId: string, isPresent: boolean) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isPresent,
        arrivalTime: isPresent ? (prev[studentId]?.arrivalTime || currentTime) : '',
      },
    }));
  };

  const handleTimeChange = (studentId: string, time: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        arrivalTime: time,
      },
    }));
  };

  const handleSubmit = () => {
    if (!students) return;
    
    const data: AttendanceFormData[] = students.map((student) => ({
      student_id: student.id,
      is_present: attendanceState[student.id]?.isPresent ?? false,
      arrival_time: attendanceState[student.id]?.arrivalTime,
    }));

    submitMutation.mutate(data);
    setIsConfirmOpen(false);
  };

  const presentCount = Object.values(attendanceState).filter((a) => a.isPresent).length;
  const totalCount = students?.length || 0;

  const isLoading = isLoadingStudents || isLoadingAttendance;

  return (
    <TeacherLayout
      title={classroom?.name || 'Carregando...'}
      showBack
      onBack={() => navigate('/teacher')}
    >
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <p className="text-muted-foreground">{format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          <p className="text-sm font-medium">
            {presentCount}/{totalCount} presentes
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : students && students.length > 0 ? (
          <div className="space-y-3">
            {students.map((student) => (
              <Card key={student.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">Idade: {student.age}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {attendanceState[student.id]?.isPresent ? 'Presente' : 'Ausente'}
                      </span>
                      <Switch
                        checked={attendanceState[student.id]?.isPresent ?? false}
                        onCheckedChange={(checked) => handleToggle(student.id, checked)}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </div>
                  {attendanceState[student.id]?.isPresent && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Label htmlFor={`time-${student.id}`} className="text-sm whitespace-nowrap">
                        Chegada:
                      </Label>
                      <Input
                        id={`time-${student.id}`}
                        type="time"
                        value={attendanceState[student.id]?.arrivalTime || ''}
                        onChange={(e) => handleTimeChange(student.id, e.target.value)}
                        className="w-auto"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                Nenhum aluno nesta turma.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Submit Button */}
      {students && students.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t">
          <Button
            className="w-full h-12 text-lg"
            onClick={() => setIsConfirmOpen(true)}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Enviando...' : 'Registrar Frequência'}
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Frequência</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a registrar a frequência da {classroom?.name}.
              <br />
              <strong>{presentCount}</strong> alunos presentes, <strong>{totalCount - presentCount}</strong> ausentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TeacherLayout>
  );
}
