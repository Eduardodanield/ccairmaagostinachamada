import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClassroomReportPDFProps {
  classroomId: string;
  classroomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassroomReportPDF({
  classroomId,
  classroomName,
  open,
  onOpenChange,
}: ClassroomReportPDFProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['classroom-report', classroomId, selectedMonth],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
      const monthEnd = endOfMonth(monthStart);

      // Get students in this classroom
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name')
        .eq('classroom_id', classroomId)
        .eq('is_archived', false)
        .order('name');

      if (studentsError) throw studentsError;

      // Get attendance for this period
      const studentIds = students?.map((s) => s.id) || [];
      let attendance: any[] = [];

      if (studentIds.length > 0) {
        const { data, error } = await supabase
          .from('attendance')
          .select('student_id, date, is_present, arrival_time')
          .in('student_id', studentIds)
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd'));

        if (error) throw error;
        attendance = data || [];
      }

      // Build attendance map
      const attendanceMap = new Map<string, Map<string, { is_present: boolean; arrival_time: string | null }>>();
      attendance.forEach((record) => {
        if (!attendanceMap.has(record.student_id)) {
          attendanceMap.set(record.student_id, new Map());
        }
        attendanceMap.get(record.student_id)!.set(record.date, {
          is_present: record.is_present,
          arrival_time: record.arrival_time,
        });
      });

      // Get weekdays of the month
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const weekdays = allDays.filter((day) => !isWeekend(day));

      // Calculate stats per student
      const studentStats = students?.map((student) => {
        const studentAttendance = attendanceMap.get(student.id) || new Map();
        let present = 0;
        let absent = 0;

        weekdays.forEach((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const record = studentAttendance.get(dateStr);
          if (record) {
            if (record.is_present) present++;
            else absent++;
          }
        });

        const total = present + absent;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          id: student.id,
          name: student.name,
          present,
          absent,
          total,
          percentage,
          attendanceByDay: studentAttendance,
        };
      }) || [];

      // Overall stats
      const totalPresent = studentStats.reduce((sum, s) => sum + s.present, 0);
      const totalAbsent = studentStats.reduce((sum, s) => sum + s.absent, 0);
      const totalRecords = totalPresent + totalAbsent;
      const overallPercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

      return {
        students: studentStats,
        weekdays,
        monthStart,
        monthEnd,
        overallStats: {
          totalStudents: students?.length || 0,
          totalPresent,
          totalAbsent,
          overallPercentage,
        },
      };
    },
    enabled: open,
  });

  const generatePDF = async () => {
    if (!reportData) return;

    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const monthName = format(new Date(selectedMonth + '-01'), "MMMM 'de' yyyy", { locale: ptBR });

      // Title
      doc.setFontSize(18);
      doc.text(`Relatório de Frequência - ${classroomName}`, 14, 20);

      doc.setFontSize(12);
      doc.text(`Período: ${monthName}`, 14, 30);

      // Overall stats
      doc.setFontSize(14);
      doc.text('Resumo Geral', 14, 45);

      doc.setFontSize(11);
      doc.text(`Total de Alunos: ${reportData.overallStats.totalStudents}`, 14, 55);
      doc.text(`Total de Presenças: ${reportData.overallStats.totalPresent}`, 14, 62);
      doc.text(`Total de Faltas: ${reportData.overallStats.totalAbsent}`, 14, 69);
      doc.text(`Taxa de Frequência: ${reportData.overallStats.overallPercentage}%`, 14, 76);

      // Student table
      doc.setFontSize(14);
      doc.text('Frequência por Aluno', 14, 92);

      const tableData = reportData.students.map((student) => [
        student.name,
        student.present.toString(),
        student.absent.toString(),
        `${student.percentage}%`,
      ]);

      autoTable(doc, {
        startY: 98,
        head: [['Aluno', 'Presenças', 'Faltas', '% Frequência']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 },
      });

      // Add a new page for daily breakdown if there are students
      if (reportData.students.length > 0 && reportData.weekdays.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Detalhamento Diário', 14, 20);

        const dailyHeaders = ['Aluno', ...reportData.weekdays.map((d) => format(d, 'dd'))];
        const dailyData = reportData.students.map((student) => {
          const row = [student.name];
          reportData.weekdays.forEach((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = student.attendanceByDay.get(dateStr);
            if (record) {
              row.push(record.is_present ? 'P' : 'F');
            } else {
              row.push('-');
            }
          });
          return row;
        });

        autoTable(doc, {
          startY: 28,
          head: [dailyHeaders],
          body: dailyData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
          styles: { fontSize: 7, cellPadding: 1 },
          columnStyles: { 0: { cellWidth: 40 } },
        });

        // Legend
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(9);
        doc.text('Legenda: P = Presente, F = Falta, - = Sem registro', 14, finalY);
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      // Save
      const fileName = `Relatorio_${classroomName.replace(/\s+/g, '_')}_${selectedMonth}.pdf`;
      doc.save(fileName);

      toast({ title: 'Relatório gerado com sucesso!' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório PDF
          </DialogTitle>
          <DialogDescription>
            Selecione o mês para gerar o relatório de frequência da {classroomName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="month">Mês do Relatório</Label>
            <Input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Carregando dados...</div>
          ) : reportData ? (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Prévia do Relatório:</p>
              <p>• Alunos: {reportData.overallStats.totalStudents}</p>
              <p>• Presenças: {reportData.overallStats.totalPresent}</p>
              <p>• Faltas: {reportData.overallStats.totalAbsent}</p>
              <p>• Taxa de Frequência: {reportData.overallStats.overallPercentage}%</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating || isLoading}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
