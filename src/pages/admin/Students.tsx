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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Archive, Search, ArchiveRestore, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Classroom } from '@/types/database';

interface StudentWithDetails {
  id: string;
  name: string;
  age: number;
  classroom_id: string | null;
  is_archived: boolean;
  created_at: string;
  birth_date: string | null;
  mother_name: string | null;
  parents_phone: string | null;
  rg: string | null;
  cpf: string | null;
  gender: string | null;
  teacher_name: string | null;
  entry_time: string | null;
  exit_time: string | null;
  classroom: { id: string; name: string } | null;
}

const initialFormData = {
  name: '',
  age: '',
  classroom_id: '',
  birth_date: '',
  mother_name: '',
  parents_phone: '',
  rg: '',
  cpf: '',
  gender: '',
  teacher_name: '',
  entry_time: '',
  exit_time: '',
};

export default function AdminStudents() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassroom, setFilterClassroom] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', showArchived],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, classroom:classrooms(id, name)')
        .eq('is_archived', showArchived)
        .order('name');
      if (error) throw error;
      return data as StudentWithDetails[];
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
    mutationFn: async (data: {
      name: string;
      age: number;
      classroom_id: string | null;
      birth_date: string | null;
      mother_name: string | null;
      parents_phone: string | null;
      rg: string | null;
      cpf: string | null;
      gender: string | null;
      teacher_name: string | null;
      entry_time: string | null;
      exit_time: string | null;
    }) => {
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentWithDetails> }) => {
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
    setFormData(initialFormData);
  };

  const prepareDataForSubmit = () => ({
    name: formData.name,
    age: parseInt(formData.age) || 0,
    classroom_id: formData.classroom_id || null,
    birth_date: formData.birth_date || null,
    mother_name: formData.mother_name || null,
    parents_phone: formData.parents_phone || null,
    rg: formData.rg || null,
    cpf: formData.cpf || null,
    gender: formData.gender || null,
    teacher_name: formData.teacher_name || null,
    entry_time: formData.entry_time || null,
    exit_time: formData.exit_time || null,
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(prepareDataForSubmit());
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    updateMutation.mutate({
      id: selectedStudent.id,
      data: prepareDataForSubmit(),
    });
  };

  const openEditDialog = (student: StudentWithDetails) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      age: student.age.toString(),
      classroom_id: student.classroom_id || '',
      birth_date: student.birth_date || '',
      mother_name: student.mother_name || '',
      parents_phone: student.parents_phone || '',
      rg: student.rg || '',
      cpf: student.cpf || '',
      gender: student.gender || '',
      teacher_name: student.teacher_name || '',
      entry_time: student.entry_time || '',
      exit_time: student.exit_time || '',
    });
    setIsEditOpen(true);
  };

  const openViewDialog = (student: StudentWithDetails) => {
    setSelectedStudent(student);
    setIsViewOpen(true);
  };

  const filteredStudents = students?.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClassroom = filterClassroom === 'all' || student.classroom_id === filterClassroom;
    return matchesSearch && matchesClassroom;
  });

  const StudentFormFields = () => (
    <ScrollArea className="max-h-[60vh] pr-4">
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Idade *</Label>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Sexo</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData({ ...formData, gender: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rg">RG</Label>
            <Input
              id="rg"
              value={formData.rg}
              onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
              placeholder="00.000.000-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        {/* Family Info */}
        <div className="space-y-2">
          <Label htmlFor="mother_name">Nome da Mãe</Label>
          <Input
            id="mother_name"
            value={formData.mother_name}
            onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parents_phone">Telefone dos Pais</Label>
          <Input
            id="parents_phone"
            value={formData.parents_phone}
            onChange={(e) => setFormData({ ...formData, parents_phone: e.target.value })}
            placeholder="(11) 99999-9999"
          />
        </div>

        {/* School Info */}
        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="teacher_name">Nome do Professor</Label>
            <Input
              id="teacher_name"
              value={formData.teacher_name}
              onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entry_time">Horário de Entrada</Label>
            <Input
              id="entry_time"
              type="time"
              value={formData.entry_time}
              onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit_time">Horário de Saída</Label>
            <Input
              id="exit_time"
              type="time"
              value={formData.exit_time}
              onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );

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
        <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
        </Button>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Aluno</DialogTitle>
              <DialogDescription>Preencha os dados do aluno abaixo.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd}>
              <StudentFormFields />
              <DialogFooter className="mt-4">
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
              <TableHead>Cadastrado em</TableHead>
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
                  <TableCell>
                    {format(new Date(student.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openViewDialog(student)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
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
                        {student.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {showArchived ? 'Nenhum aluno arquivado encontrado.' : 'Nenhum aluno encontrado. Adicione seu primeiro aluno!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Aluno</DialogTitle>
            <DialogDescription>Informações completas do cadastro.</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Nome:</span> {selectedStudent.name}</div>
                  <div><span className="font-medium">Idade:</span> {selectedStudent.age}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Sexo:</span> {selectedStudent.gender || '—'}</div>
                  <div>
                    <span className="font-medium">Nascimento:</span>{' '}
                    {selectedStudent.birth_date
                      ? format(new Date(selectedStudent.birth_date), "dd/MM/yyyy", { locale: ptBR })
                      : '—'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">RG:</span> {selectedStudent.rg || '—'}</div>
                  <div><span className="font-medium">CPF:</span> {selectedStudent.cpf || '—'}</div>
                </div>
                <div><span className="font-medium">Nome da Mãe:</span> {selectedStudent.mother_name || '—'}</div>
                <div><span className="font-medium">Telefone dos Pais:</span> {selectedStudent.parents_phone || '—'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">Sala:</span> {selectedStudent.classroom?.name || '—'}</div>
                  <div><span className="font-medium">Professor:</span> {selectedStudent.teacher_name || '—'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Entrada:</span>{' '}
                    {selectedStudent.entry_time ? selectedStudent.entry_time.slice(0, 5) : '—'}
                  </div>
                  <div>
                    <span className="font-medium">Saída:</span>{' '}
                    {selectedStudent.exit_time ? selectedStudent.exit_time.slice(0, 5) : '—'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Cadastrado em:</span>{' '}
                  {format(new Date(selectedStudent.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>Atualize os dados do aluno.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <StudentFormFields />
            <DialogFooter className="mt-4">
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
