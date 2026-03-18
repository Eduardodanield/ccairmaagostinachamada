import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherLayout } from '@/components/layouts/TeacherLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  classroom_id: string;
  teacher_id: string;
  activity_date: string;
  title: string;
  description: string | null;
  created_at: string;
  classroom?: { id: string; name: string };
}

export default function TeacherActivities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [formData, setFormData] = useState({
    classroom_id: '',
    activity_date: '',
    title: '',
    description: '',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Only fetch classrooms assigned to this teacher
  const { data: classrooms, isLoading: isLoadingClassrooms } = useQuery({
    queryKey: ['teacher-assigned-classrooms', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: assignments, error: assignError } = await supabase
        .from('teacher_classrooms')
        .select('classroom_id, classroom:classrooms(id, name)')
        .eq('teacher_id', user.id);
      if (assignError) throw assignError;
      return (assignments as any[])?.map(a => a.classroom).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  const { data: activities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ['activities', format(monthStart, 'yyyy-MM'), selectedClassroom],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select('*, classroom:classrooms(id, name)')
        .gte('activity_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('activity_date');

      if (selectedClassroom !== 'all') {
        query = query.eq('classroom_id', selectedClassroom);
      } else if (classrooms && classrooms.length > 0) {
        query = query.in('classroom_id', classrooms.map(c => c.id));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!classrooms,
  });

  const addMutation = useMutation({
    mutationFn: async (data: {
      classroom_id: string;
      teacher_id: string;
      activity_date: string;
      title: string;
      description: string | null;
    }) => {
      const { error } = await supabase.from('activities').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: 'Atividade adicionada com sucesso' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast({ title: 'Já existe uma atividade para esta data e sala', variant: 'destructive' });
      } else {
        toast({ title: 'Falha ao adicionar atividade', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Activity> }) => {
      const { error } = await supabase.from('activities').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsEditOpen(false);
      setSelectedActivity(null);
      resetForm();
      toast({ title: 'Atividade atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao atualizar atividade', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsDeleteOpen(false);
      setSelectedActivity(null);
      toast({ title: 'Atividade excluída' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao excluir atividade', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ classroom_id: '', activity_date: '', title: '', description: '' });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    addMutation.mutate({
      classroom_id: formData.classroom_id,
      teacher_id: user.id,
      activity_date: formData.activity_date,
      title: formData.title,
      description: formData.description || null,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    updateMutation.mutate({
      id: selectedActivity.id,
      data: { title: formData.title, description: formData.description || null },
    });
  };

  const openAddDialogForDate = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setFormData({
      ...formData,
      activity_date: format(date, 'yyyy-MM-dd'),
      classroom_id: selectedClassroom !== 'all' ? selectedClassroom : (classrooms?.[0]?.id || ''),
    });
    setIsAddOpen(true);
  };

  const openEditDialog = (activity: Activity) => {
    setSelectedActivity(activity);
    setFormData({
      classroom_id: activity.classroom_id,
      activity_date: activity.activity_date,
      title: activity.title,
      description: activity.description || '',
    });
    setIsEditOpen(true);
  };

  const getActivityForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return activities?.filter((a) => a.activity_date === dateStr) || [];
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  return (
    <TeacherLayout title="Cronograma de Atividades">
      <div className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>←</Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>→</Button>
          </div>

          <div className="flex gap-2">
            {classrooms && classrooms.length > 1 && (
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar sala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Salas</SelectItem>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </div>
        </div>

        {isLoadingActivities || isLoadingClassrooms ? (
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {[...Array(monthStart.getDay())].map((_, i) => (
                <div key={`empty-${i}`} className="h-24 rounded-lg bg-muted/30" />
              ))}

              {daysInMonth.map((day) => {
                const dayActivities = getActivityForDay(day);
                const weekend = isWeekend(day);
                const todayCheck = isToday(day);

                return (
                  <Card
                    key={day.toISOString()}
                    className={`h-24 overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 ${
                      weekend ? 'bg-muted/40' : ''
                    } ${todayCheck ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => !weekend && openAddDialogForDate(day)}
                  >
                    <CardHeader className="p-2 pb-0">
                      <span className={`text-sm font-medium ${todayCheck ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </span>
                    </CardHeader>
                    <CardContent className="p-2 pt-0 space-y-1">
                      {dayActivities.slice(0, 2).map((activity) => (
                        <div
                          key={activity.id}
                          className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate cursor-pointer hover:bg-primary/20"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(activity); }}
                          title={`${activity.classroom?.name}: ${activity.title}`}
                        >
                          {activity.title}
                        </div>
                      ))}
                      {dayActivities.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{dayActivities.length - 2} mais</span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Atividades do Mês
            </CardTitle>
            <CardDescription>{activities?.length || 0} atividade(s) programada(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {activities && activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-lg font-bold text-primary">{format(new Date(activity.activity_date), 'dd')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(activity.activity_date), 'EEE', { locale: ptBR })}</p>
                      </div>
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.classroom?.name}
                          {activity.description && ` • ${activity.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(activity)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedActivity(activity); setIsDeleteOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma atividade programada para este mês.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
            <DialogDescription>Adicione uma atividade ao cronograma.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-classroom">Sala *</Label>
              <Select value={formData.classroom_id} onValueChange={(value) => setFormData({ ...formData, classroom_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sala" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-date">Data *</Label>
              <Input id="add-date" type="date" value={formData.activity_date} onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-title">Título *</Label>
              <Input id="add-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Aula de Pintura" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description">Descrição (opcional)</Label>
              <Textarea id="add-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detalhes da atividade..." rows={3} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addMutation.isPending || !formData.classroom_id}>
                {addMutation.isPending ? 'Salvando...' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Atividade</DialogTitle>
            <DialogDescription>Atualize os dados da atividade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Sala</Label>
              <Input value={selectedActivity?.classroom?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input value={selectedActivity?.activity_date ? format(new Date(selectedActivity.activity_date), 'dd/MM/yyyy') : ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
            <DialogFooter>
              <div className="flex gap-2 w-full justify-between">
                <Button type="button" variant="destructive" size="sm" onClick={() => { setIsEditOpen(false); setIsDeleteOpen(true); }}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{selectedActivity?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => selectedActivity && deleteMutation.mutate(selectedActivity.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TeacherLayout>
  );
}
