import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Pencil } from 'lucide-react';
import type { Profile, Classroom } from '@/types/database';

interface TeacherWithClassrooms extends Profile {
  classrooms: { id: string; name: string }[];
}

export default function AdminTeachers() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithClassrooms | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [editClassroomId, setEditClassroomId] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: classrooms } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classrooms').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      if (profilesError) throw profilesError;

      // Fetch classroom assignments
      const { data: assignments, error: assignError } = await supabase
        .from('teacher_classrooms')
        .select('teacher_id, classroom_id, classroom:classrooms(id, name)')
        .in('teacher_id', userIds);

      const assignmentMap: Record<string, { id: string; name: string }[]> = {};
      if (assignments) {
        for (const a of assignments as any[]) {
          if (!assignmentMap[a.teacher_id]) assignmentMap[a.teacher_id] = [];
          if (a.classroom) assignmentMap[a.teacher_id].push(a.classroom);
        }
      }

      return (profiles as Profile[]).map(p => ({
        ...p,
        classrooms: assignmentMap[p.user_id] || [],
      })) as TeacherWithClassrooms[];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; classroomId: string }) => {
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: { email: data.email, password: data.password, fullName: data.fullName, role: 'teacher' },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      // Assign classroom if selected
      if (data.classroomId && result?.userId) {
        const { error: assignError } = await supabase
          .from('teacher_classrooms')
          .insert({ teacher_id: result.userId, classroom_id: data.classroomId });
        if (assignError) throw assignError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsInviteOpen(false);
      setEmail(''); setFullName(''); setPassword(''); setSelectedClassroomId('');
      toast({ title: 'Professor criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao criar professor', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: result, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast({ title: 'Professor excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao excluir professor', description: error.message, variant: 'destructive' });
    },
  });

  const updateClassroomMutation = useMutation({
    mutationFn: async ({ teacherId, classroomId }: { teacherId: string; classroomId: string }) => {
      // Remove existing assignments
      await supabase.from('teacher_classrooms').delete().eq('teacher_id', teacherId);
      // Insert new assignment
      if (classroomId) {
        const { error } = await supabase
          .from('teacher_classrooms')
          .insert({ teacher_id: teacherId, classroom_id: classroomId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsEditOpen(false);
      setEditingTeacher(null);
      toast({ title: 'Sala atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao atualizar sala', description: error.message, variant: 'destructive' });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ email, password, fullName, classroomId: selectedClassroomId });
  };

  const handleOpenEdit = (teacher: TeacherWithClassrooms) => {
    setEditingTeacher(teacher);
    setEditClassroomId(teacher.classrooms[0]?.id || '');
    setIsEditOpen(true);
  };

  const handleSaveClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    updateClassroomMutation.mutate({ teacherId: editingTeacher.user_id, classroomId: editClassroomId });
  };

  return (
    <AdminLayout title="Professores" description="Gerenciar contas de professores">
      <div className="flex justify-end mb-6">
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEmail(''); setFullName(''); setPassword(''); setSelectedClassroomId(''); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Professor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Novo Professor</DialogTitle>
              <DialogDescription>Crie uma nova conta de professor e atribua uma sala.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maria Silva" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="professor@escola.com.br" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label>Sala</Label>
                <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
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
              <DialogFooter>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Criando...' : 'Criar Conta'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Classroom Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sala do Professor</DialogTitle>
            <DialogDescription>
              Altere a sala atribuída a <strong>{editingTeacher?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveClassroom} className="space-y-4">
            <div className="space-y-2">
              <Label>Sala</Label>
              <Select value={editClassroomId} onValueChange={setEditClassroomId}>
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
            <DialogFooter>
              <Button type="submit" disabled={updateClassroomMutation.isPending}>
                {updateClassroomMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sala</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : teachers && teachers.length > 0 ? (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.full_name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>
                    {teacher.classrooms.length > 0 ? (
                      teacher.classrooms.map(c => (
                        <Badge key={c.id} variant="outline" className="mr-1">{c.name}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem sala</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(teacher)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir professor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação é permanente. <strong>{teacher.full_name}</strong> será removido completamente do sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(teacher.user_id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum professor encontrado. Convide seu primeiro professor!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
