import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2, Loader2, Database, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

export function BackupCleanupDialog() {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupType, setCleanupType] = useState<string>('');
  const [monthsOld, setMonthsOld] = useState('12');
  const [isCleaning, setIsCleaning] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { toast } = useToast();

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const [studentsRes, classroomsRes, attendanceRes, activitiesRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('classrooms').select('*'),
        supabase.from('attendance').select('*, students(name, classroom_id)'),
        supabase.from('activities').select('*'),
      ]);

      const wb = XLSX.utils.book_new();

      // Students sheet
      if (studentsRes.data?.length) {
        const studentsWs = XLSX.utils.json_to_sheet(studentsRes.data.map(s => ({
          Nome: s.name,
          Idade: s.age,
          'Data Nascimento': s.birth_date,
          Gênero: s.gender,
          'Nome da Mãe': s.mother_name,
          'Telefone Responsável': s.parents_phone,
          RG: s.rg,
          CPF: s.cpf,
          Arquivado: s.is_archived ? 'Sim' : 'Não',
          'Criado em': s.created_at,
        })));
        XLSX.utils.book_append_sheet(wb, studentsWs, 'Alunos');
      }

      // Classrooms sheet
      if (classroomsRes.data?.length) {
        const classroomsWs = XLSX.utils.json_to_sheet(classroomsRes.data.map(c => ({
          Nome: c.name,
          Turno: c.shift || '',
          'Criado em': c.created_at,
        })));
        XLSX.utils.book_append_sheet(wb, classroomsWs, 'Salas');
      }

      // Attendance sheet
      if (attendanceRes.data?.length) {
        const attendanceWs = XLSX.utils.json_to_sheet(attendanceRes.data.map((a: any) => ({
          Aluno: a.students?.name || '',
          Data: a.date,
          Presente: a.is_present ? 'Sim' : 'Não',
          'Hora Chegada': a.arrival_time || '',
          'Horas Frequentadas': a.hours_attended,
        })));
        XLSX.utils.book_append_sheet(wb, attendanceWs, 'Presenças');
      }

      // Activities sheet
      if (activitiesRes.data?.length) {
        const activitiesWs = XLSX.utils.json_to_sheet(activitiesRes.data.map(a => ({
          Título: a.title,
          Descrição: a.description || '',
          Data: a.activity_date,
          'Criado em': a.created_at,
        })));
        XLSX.utils.book_append_sheet(wb, activitiesWs, 'Atividades');
      }

      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Backup_CCA_${today}.xlsx`);

      toast({
        title: 'Backup exportado!',
        description: 'O arquivo Excel foi baixado com todos os dados.',
      });
    } catch (err) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o backup.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCleanup = async () => {
    if (confirmText !== 'LIMPAR') return;

    setIsCleaning(true);
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(monthsOld));
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      if (cleanupType === 'attendance' || cleanupType === 'both') {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .lt('date', cutoffStr);
        if (error) throw error;
      }

      if (cleanupType === 'archived' || cleanupType === 'both') {
        // First delete attendance records of archived students
        const { data: archivedStudents } = await supabase
          .from('students')
          .select('id')
          .eq('is_archived', true);

        if (archivedStudents?.length) {
          const ids = archivedStudents.map(s => s.id);
          await supabase.from('attendance').delete().in('student_id', ids);
          await supabase.from('students').delete().eq('is_archived', true);
        }
      }

      toast({
        title: 'Limpeza concluída!',
        description: 'Os dados antigos foram removidos com sucesso.',
      });

      setShowCleanup(false);
      setConfirmText('');
      setCleanupType('');
    } catch (err) {
      toast({
        title: 'Erro na limpeza',
        description: 'Não foi possível limpar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-sidebar-foreground"
        onClick={() => { setOpen(true); setShowCleanup(false); }}
      >
        <Database className="h-4 w-4 mr-2" />
        Backup & Limpeza
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Backup & Limpeza de Dados
            </DialogTitle>
            <DialogDescription>
              Exporte um backup completo ou limpe dados antigos para liberar espaço.
            </DialogDescription>
          </DialogHeader>

          {!showCleanup ? (
            <div className="space-y-4">
              {/* Export Section */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-foreground">Exportar Backup</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Baixe todos os dados (alunos, salas, presenças e atividades) em um arquivo Excel.
                </p>
                <Button onClick={handleExportBackup} disabled={isExporting} className="w-full">
                  {isExporting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exportando...</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> Baixar Backup Excel</>
                  )}
                </Button>
              </div>

              {/* Cleanup Section */}
              <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <h3 className="font-medium text-foreground">Limpar Dados Antigos</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Remova registros de presença antigos ou alunos arquivados para liberar espaço no banco de dados.
                </p>
                <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setShowCleanup(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Configurar Limpeza
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">
                  <strong>Atenção:</strong> Esta ação é irreversível. Faça um backup antes de continuar.
                </p>
              </div>

              <div className="space-y-2">
                <Label>O que limpar?</Label>
                <Select value={cleanupType} onValueChange={setCleanupType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendance">Presenças antigas</SelectItem>
                    <SelectItem value="archived">Alunos arquivados</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(cleanupType === 'attendance' || cleanupType === 'both') && (
                <div className="space-y-2">
                  <Label>Apagar presenças com mais de:</Label>
                  <Select value={monthsOld} onValueChange={setMonthsOld}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                      <SelectItem value="18">18 meses</SelectItem>
                      <SelectItem value="24">24 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {cleanupType && (
                <div className="space-y-2">
                  <Label>Digite <strong>LIMPAR</strong> para confirmar:</Label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="LIMPAR"
                  />
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setShowCleanup(false); setConfirmText(''); setCleanupType(''); }}>
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  disabled={!cleanupType || confirmText !== 'LIMPAR' || isCleaning}
                  onClick={handleCleanup}
                >
                  {isCleaning ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando...</>
                  ) : (
                    <><Trash2 className="mr-2 h-4 w-4" /> Confirmar Limpeza</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
