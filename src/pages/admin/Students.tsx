import { useState, useRef } from 'react';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Archive, Search, ArchiveRestore, Eye, Upload, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
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
  name: '', age: '', classroom_id: '', birth_date: '', mother_name: '', parents_phone: '',
  rg: '', cpf: '', gender: '', teacher_name: '', entry_time: '', exit_time: '',
};

export default function AdminStudents() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isChangeClassroomOpen, setIsChangeClassroomOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassroom, setFilterClassroom] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [newClassroomId, setNewClassroomId] = useState('');
  const [importData, setImportData] = useState<{ name: string; age: number; birth_date: string | null }[]>([]);
  const [importClassroomId, setImportClassroomId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data, error } = await supabase.from('classrooms').select('*').order('name');
      if (error) throw error;
      return data as Classroom[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; age: number; classroom_id: string | null; birth_date: string | null; mother_name: string | null; parents_phone: string | null; rg: string | null; cpf: string | null; gender: string | null; teacher_name: string | null; entry_time: string | null; exit_time: string | null }) => {
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
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
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
      const { error } = await supabase.from('students').update({ is_archived: archive }).eq('id', id);
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

  const changeClassroomMutation = useMutation({
    mutationFn: async ({ id, classroom_id }: { id: string; classroom_id: string | null }) => {
      const { error } = await supabase.from('students').update({ classroom_id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsChangeClassroomOpen(false);
      setSelectedStudent(null);
      setNewClassroomId('');
      toast({ title: 'Sala do aluno alterada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao mudar sala', description: error.message, variant: 'destructive' });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (students: { name: string; age: number; birth_date: string | null; classroom_id: string | null }[]) => {
      const { error } = await supabase.from('students').insert(students);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsImportOpen(false);
      setImportData([]);
      setImportClassroomId('');
      toast({ title: `${importData.length} alunos importados com sucesso!` });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao importar alunos', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => setFormData(initialFormData);

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

  const handleAdd = (e: React.FormEvent) => { e.preventDefault(); addMutation.mutate(prepareDataForSubmit()); };
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    updateMutation.mutate({ id: selectedStudent.id, data: prepareDataForSubmit() });
  };

  const openEditDialog = (student: StudentWithDetails) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name, age: student.age.toString(), classroom_id: student.classroom_id || '',
      birth_date: student.birth_date || '', mother_name: student.mother_name || '',
      parents_phone: student.parents_phone || '', rg: student.rg || '', cpf: student.cpf || '',
      gender: student.gender || '', teacher_name: student.teacher_name || '',
      entry_time: student.entry_time || '', exit_time: student.exit_time || '',
    });
    setIsEditOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const parsed: { name: string; age: number; birth_date: string | null }[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown[][];

          for (const row of json) {
            if (!Array.isArray(row) || row.length < 2) continue;
            
            // Try to find name column (look for text that looks like a name)
            let name = '';
            let birthDate: string | null = null;
            let age = 0;

            for (let i = 0; i < row.length; i++) {
              const cell = row[i];
              if (typeof cell === 'string' && cell.length > 3 && /^[A-ZÀ-Ú][a-zà-ú]/.test(cell) && !cell.includes('CCA') && !cell.includes('Mês') && !cell.includes('Grupo') && !cell.includes('Total') && !cell.includes('ASSINATURA') && !cell.includes('Nome') && !cell.includes('Controle') && !cell.includes('Responsável')) {
                name = cell.trim();
              }
              // Check for date (could be Excel serial or string)
              if (typeof cell === 'number' && cell > 10000 && cell < 50000 && !name) continue;
              if (typeof cell === 'number' && cell > 10000 && cell < 50000 && name) {
                const dateObj = XLSX.SSF.parse_date_code(cell);
                if (dateObj) {
                  birthDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
                }
              }
              if (typeof cell === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(cell) && name) {
                const parts = cell.split('/');
                const month = parts[0].padStart(2, '0');
                const day = parts[1].padStart(2, '0');
                let year = parts[2];
                if (year.length === 2) year = parseInt(year) > 50 ? '19' + year : '20' + year;
                birthDate = `${year}-${month}-${day}`;
              }
              if (typeof cell === 'number' && cell >= 1 && cell <= 99 && name && !age) {
                age = cell;
              }
            }

            if (name) {
              // Calculate age from birth date if not found
              if (!age && birthDate) {
                const birth = new Date(birthDate);
                const today = new Date();
                age = today.getFullYear() - birth.getFullYear();
              }
              parsed.push({ name, age: age || 0, birth_date: birthDate });
            }
          }
        }

        if (parsed.length === 0) {
          toast({ title: 'Nenhum aluno encontrado', description: 'Verifique o formato do arquivo Excel.', variant: 'destructive' });
          return;
        }

        setImportData(parsed);
        setIsImportOpen(true);
      } catch {
        toast({ title: 'Erro ao ler arquivo', description: 'Verifique se é um arquivo Excel válido.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = () => {
    const studentsToInsert = importData.map(s => ({
      ...s,
      classroom_id: importClassroomId || null,
    }));
    importMutation.mutate(studentsToInsert);
  };

  const filteredStudents = students?.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClassroom = filterClassroom === 'all' || student.classroom_id === filterClassroom;
    return matchesSearch && matchesClassroom;
  });

  const StudentFormFields = () => (
    <ScrollArea className="max-h-[60vh] pr-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Idade *</Label>
            <Input id="age" type="number" min="1" max="99" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Sexo</Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
            <Input id="rg" value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} placeholder="00.000.000-0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mother_name">Nome da Mãe</Label>
          <Input id="mother_name" value={formData.mother_name} onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parents_phone">Telefone dos Pais</Label>
          <Input id="parents_phone" value={formData.parents_phone} onChange={(e) => setFormData({ ...formData, parents_phone: e.target.value })} placeholder="(11) 99999-9999" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="classroom">Sala</Label>
            <Select value={formData.classroom_id} onValueChange={(value) => setFormData({ ...formData, classroom_id: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione uma sala" /></SelectTrigger>
              <SelectContent>
                {classrooms?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}{c.shift ? ` (${c.shift})` : ''}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher_name">Nome do Professor</Label>
            <Input id="teacher_name" value={formData.teacher_name} onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entry_time">Horário de Entrada</Label>
            <Input id="entry_time" type="time" value={formData.entry_time} onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit_time">Horário de Saída</Label>
            <Input id="exit_time" type="time" value={formData.exit_time} onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })} />
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
          <Input placeholder="Buscar alunos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterClassroom} onValueChange={setFilterClassroom}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por sala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Salas</SelectItem>
            {classrooms?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
        </Button>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
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
                  <TableCell>{format(new Date(student.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => { setSelectedStudent(student); setIsViewOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEditDialog(student)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Mudar sala" onClick={() => { setSelectedStudent(student); setNewClassroomId(student.classroom_id || ''); setIsChangeClassroomOpen(true); }}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(student); setIsArchiveOpen(true); }}>
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
                  <div><span className="font-medium">Nascimento:</span>{' '}{selectedStudent.birth_date ? format(new Date(selectedStudent.birth_date), "dd/MM/yyyy", { locale: ptBR }) : '—'}</div>
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
                  <div><span className="font-medium">Entrada:</span> {selectedStudent.entry_time ? selectedStudent.entry_time.slice(0, 5) : '—'}</div>
                  <div><span className="font-medium">Saída:</span> {selectedStudent.exit_time ? selectedStudent.exit_time.slice(0, 5) : '—'}</div>
                </div>
                <div><span className="font-medium">Cadastrado em:</span> {format(new Date(selectedStudent.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
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

      {/* Change Classroom Dialog */}
      <Dialog open={isChangeClassroomOpen} onOpenChange={setIsChangeClassroomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar Sala do Aluno</DialogTitle>
            <DialogDescription>Selecione a nova sala para "{selectedStudent?.name}".</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sala Atual</Label>
              <p className="text-sm text-muted-foreground">{selectedStudent?.classroom?.name || 'Sem sala'}</p>
            </div>
            <div className="space-y-2">
              <Label>Nova Sala</Label>
              <Select value={newClassroomId} onValueChange={setNewClassroomId}>
                <SelectTrigger><SelectValue placeholder="Selecione a nova sala" /></SelectTrigger>
                <SelectContent>
                  {classrooms?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}{c.shift ? ` (${c.shift})` : ''}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={() => selectedStudent && changeClassroomMutation.mutate({ id: selectedStudent.id, classroom_id: newClassroomId || null })}
                disabled={changeClassroomMutation.isPending}
              >
                {changeClassroomMutation.isPending ? 'Salvando...' : 'Confirmar Mudança'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Alunos do Excel</DialogTitle>
            <DialogDescription>Foram encontrados {importData.length} alunos. Selecione a sala e confirme.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sala de Destino</Label>
              <Select value={importClassroomId} onValueChange={setImportClassroomId}>
                <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
                <SelectContent>
                  {classrooms?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}{c.shift ? ` (${c.shift})` : ''}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="max-h-[40vh] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Nascimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.age || '—'}</TableCell>
                      <TableCell>{s.birth_date || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? 'Importando...' : `Importar ${importData.length} Alunos`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedStudent?.is_archived ? 'Restaurar Aluno?' : 'Arquivar Aluno?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStudent?.is_archived
                ? `Isso irá restaurar "${selectedStudent?.name}" para os alunos ativos.`
                : `Isso irá arquivar "${selectedStudent?.name}". O histórico de frequência será preservado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedStudent && archiveMutation.mutate({ id: selectedStudent.id, archive: !selectedStudent.is_archived })}>
              {selectedStudent?.is_archived ? 'Restaurar' : 'Arquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
