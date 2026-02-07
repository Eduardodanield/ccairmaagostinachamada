import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Archive, Search, ArchiveRestore } from 'lucide-react';
import type { Student, Classroom } from '@/types/database';

export default function AdminStudents() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassroom, setFilterClassroom] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    classroom_id: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', showArchived],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('*, classroom:classrooms(id, name)')
        .eq('is_archived', showArchived)
        .order('name');
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (Student & { classroom: Classroom | null })[];
    },
  });

  const { data: classrooms } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Classroom[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; age: number; classroom_id: string | null }) => {
      const { error } = await supabase.from('students').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: 'Aluno adicionado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao adicionar aluno', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Student> }) => {
      const { error } = await supabase.from('students').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsEditOpen(false);
      setSelectedStudent(null);
      resetForm();
      toast({ title: 'Aluno atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao atualizar aluno', description: error.message, variant: 'destructive' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from('students')
        .update({ is_archived: archive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsArchiveOpen(false);
      setSelectedStudent(null);
      toast({ title: archive ? 'Aluno arquivado' : 'Aluno restaurado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao arquivar aluno', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', age: '', classroom_id: '' });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      name: formData.name,
      age: parseInt(formData.age),
      classroom_id: formData.classroom_id || null,
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    updateMutation.mutate({
      id: selectedStudent.id,
      data: {
        name: formData.name,
        age: parseInt(formData.age),
        classroom_id: formData.classroom_id || null,
      },
    });
  };

  const openEditDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      age: student.age.toString(),
      classroom_id: student.classroom_id || '',
    });
    setIsEditOpen(true);
  };

  const filteredStudents = students?.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClassroom = filterClassroom === 'all' || student.classroom_id === filterClassroom;
    return matchesSearch && matchesClassroom;
  });

  return (
    <AdminLayout title="Alunos" description="Gerenciar cadastro de alunos">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar alunos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterClassroom} onValueChange={setFilterClassroom}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por sala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Salas</SelectItem>
            {classrooms?.map((classroom) => (
              <SelectItem key={classroom.id} value={classroom.id}>
                {classroom.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
        </Button>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Aluno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Aluno</DialogTitle>
              <DialogDescription>Preencha os dados do aluno abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="99"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classroom">Sala</Label>
                <Select
                  value={formData.classroom_id}
                  onValueChange={(value) => setFormData({ ...formData, classroom_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms?.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Adicionando...' : 'Adicionar Aluno'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Students Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Sala</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredStudents && filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.age}</TableCell>
                  <TableCell>{student.classroom?.name || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(student)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedStudent(student);
                          setIsArchiveOpen(true);
                        }}
                      >
                        {student.is_archived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {showArchived ? 'Nenhum aluno arquivado encontrado.' : 'Nenhum aluno encontrado. Adicione seu primeiro aluno!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>Atualize os dados do aluno.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-age">Idade</Label>
              <Input
                id="edit-age"
                type="number"
                min="1"
                max="99"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-classroom">Sala</Label>
              <Select
                value={formData.classroom_id}
                onValueChange={(value) => setFormData({ ...formData, classroom_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma sala" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms?.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>
                  ))}
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

      {/* Archive Confirmation */}
      <AlertDialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStudent?.is_archived ? 'Restaurar Aluno?' : 'Arquivar Aluno?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStudent?.is_archived
                ? `Isso irá restaurar "${selectedStudent?.name}" para os alunos ativos.`
                : `Isso irá arquivar "${selectedStudent?.name}". O histórico de frequência será preservado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedStudent &&
                archiveMutation.mutate({
                  id: selectedStudent.id,
                  archive: !selectedStudent.is_archived,
                })
              }
            >
              {selectedStudent?.is_archived ? 'Restaurar' : 'Arquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
