import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, FileText, Sun, Moon } from 'lucide-react';
import { ClassroomReportPDF } from '@/components/admin/ClassroomReportPDF';
import type { Classroom } from '@/types/database';

export default function AdminClassrooms() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [name, setName] = useState('');
  const [shift, setShift] = useState<string>('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: classrooms, isLoading } = useQuery({
    queryKey: ['classrooms-with-count'],
    queryFn: async () => {
      const { data: classroomsData, error: classroomsError } = await supabase
        .from('classrooms')
        .select('*')
        .order('name');
      if (classroomsError) throw classroomsError;

      const classroomIds = classroomsData.map(c => c.id);
      const { data: studentsData } = await supabase
        .from('students')
        .select('classroom_id')
        .eq('is_archived', false)
        .in('classroom_id', classroomIds);

      const counts = classroomIds.reduce((acc, id) => {
        acc[id] = studentsData?.filter(s => s.classroom_id === id).length || 0;
        return acc;
      }, {} as Record<string, number>);

      return classroomsData.map(c => ({
        ...c,
        studentCount: counts[c.id] || 0,
      }));
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, shift }: { name: string; shift: string | null }) => {
      const { error } = await supabase.from('classrooms').insert([{ name, shift }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms-with-count'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setIsAddOpen(false);
      setName('');
      setShift('');
      toast({ title: 'Sala criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao criar sala', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, shift }: { id: string; name: string; shift: string | null }) => {
      const { error } = await supabase.from('classrooms').update({ name, shift }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms-with-count'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setIsEditOpen(false);
      setSelectedClassroom(null);
      setName('');
      setShift('');
      toast({ title: 'Sala atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao atualizar sala', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classrooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms-with-count'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setIsDeleteOpen(false);
      setSelectedClassroom(null);
      toast({ title: 'Sala excluída com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao excluir sala', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({ name, shift: shift || null });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroom) return;
    updateMutation.mutate({ id: selectedClassroom.id, name, shift: shift || null });
  };

  const openEditDialog = (classroom: Classroom & { studentCount: number }) => {
    setSelectedClassroom(classroom);
    setName(classroom.name);
    setShift(classroom.shift || '');
    setIsEditOpen(true);
  };

  const ShiftBadge = ({ shift }: { shift: string | null }) => {
    if (!shift) return null;
    return (
      <Badge variant="outline" className="text-xs gap-1">
        {shift === 'manhã' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        {shift === 'manhã' ? 'Manhã' : 'Tarde'}
      </Badge>
    );
  };

  return (
    <AdminLayout title="Salas de Aula" description="Gerenciar as salas da escola">
      <div className="flex justify-end mb-6">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setName(''); setShift(''); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Sala
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Sala</DialogTitle>
              <DialogDescription>Preencha as informações da sala.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Sala</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Grupo Alessandra" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift">Turno</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger><SelectValue placeholder="Selecione o turno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manhã">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Criando...' : 'Criar Sala'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-24" /></CardHeader></Card>
          ))}
        </div>
      ) : classrooms && classrooms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <Card key={classroom.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{classroom.name}</CardTitle>
                    <ShiftBadge shift={classroom.shift} />
                  </div>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3" />
                    {classroom.studentCount} alunos
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Gerar relatório PDF" onClick={() => { setSelectedClassroom(classroom); setIsReportOpen(true); }}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(classroom)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedClassroom(classroom); setIsDeleteOpen(true); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma sala encontrada. Crie sua primeira sala!</p>
            <Button onClick={() => { setName(''); setShift(''); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Sala
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sala</DialogTitle>
            <DialogDescription>Atualize as informações da sala.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Sala</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shift">Turno</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger><SelectValue placeholder="Selecione o turno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manhã">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Sala?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir "{selectedClassroom?.name}". Os alunos desta sala ficarão sem sala atribuída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedClassroom && deleteMutation.mutate(selectedClassroom.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedClassroom && (
        <ClassroomReportPDF classroomId={selectedClassroom.id} classroomName={selectedClassroom.name} open={isReportOpen} onOpenChange={setIsReportOpen} />
      )}
    </AdminLayout>
  );
}
