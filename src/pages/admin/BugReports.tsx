import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Bug, CheckCircle2, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminBugReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['bug-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast({ title: 'Relato removido' });
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" /> Aberto</Badge>;
      case 'resolved':
        return <Badge className="gap-1 bg-emerald-500"><CheckCircle2 className="h-3 w-3" /> Resolvido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Relatos de Erros" description="Bugs e problemas reportados pelos usuários">
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))
        ) : !reports?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bug className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhum relato de erro encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(report.status)}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground">{report.subject}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Por: <strong>{report.user_name}</strong> ({report.user_email})</span>
                      {report.page_url && <span>Página: {new URL(report.page_url).pathname}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {report.status === 'open' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => updateStatus.mutate({ id: report.id, status: 'resolved' })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: report.id, status: 'open' })}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1" /> Reabrir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteReport.mutate(report.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
