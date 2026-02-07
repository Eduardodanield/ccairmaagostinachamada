import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Classroom } from '@/types/database';

export default function AdminAttendance() {
  const [filterClassroom, setFilterClassroom] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance-records', filterClassroom, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          date,
          arrival_time,
          is_present,
          hours_attended,
          student:students(
            id,
            name,
            classroom:classrooms(id, name)
          ),
          recorder:profiles!attendance_recorded_by_fkey(full_name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filter by classroom if selected
      let filtered = data || [];
      if (filterClassroom !== 'all') {
        filtered = filtered.filter(
          (record: any) => record.student?.classroom?.id === filterClassroom
        );
      }

      return filtered;
    },
  });

  return (
    <AdminLayout title="Registros de Frequência" description="Visualizar e filtrar histórico de frequência">
      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="space-y-2">
          <Label>Sala</Label>
          <Select value={filterClassroom} onValueChange={setFilterClassroom}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as salas" />
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
        </div>
        <div className="space-y-2">
          <Label>Data Inicial</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Data Final</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Sala</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hora de Chegada</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Registrado Por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : attendance && attendance.length > 0 ? (
              attendance.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell>{format(new Date(record.date), "d 'de' MMM, yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">{record.student?.name}</TableCell>
                  <TableCell>{record.student?.classroom?.name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={record.is_present ? 'default' : 'secondary'}>
                      {record.is_present ? 'Presente' : 'Ausente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.arrival_time ? format(new Date(`1970-01-01T${record.arrival_time}`), 'HH:mm') : '—'}
                  </TableCell>
                  <TableCell>{record.hours_attended}h</TableCell>
                  <TableCell>{record.recorder?.full_name || '—'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum registro de frequência encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
