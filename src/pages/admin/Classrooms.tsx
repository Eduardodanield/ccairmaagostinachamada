import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import type { Classroom } from '@/types/database';

export default function AdminClassrooms() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [name, setName] = useState('');

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

      // Get student counts for each classroom
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
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('classrooms').insert([{ name }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms-with-count'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setIsAddOpen(false);
      setName('');
      toast({ title: 'Classroom created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create classroom', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('classrooms').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms-with-count'] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setIsEditOpen(false);
      setSelectedClassroom(null);
      setName('');
      toast({ title: 'Classroom updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update classroom', description: error.message, variant: 'destructive' });
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
      toast({ title: 'Classroom deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete classroom', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(name);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassroom) return;
    updateMutation.mutate({ id: selectedClassroom.id, name });
  };

  const openEditDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setName(classroom.name);
    setIsEditOpen(true);
  };

  return (
    <AdminLayout title="Classrooms" description="Manage your school's classrooms">
      {/* Actions Bar */}
      <div className="flex justify-end mb-6">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setName('')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Classroom</DialogTitle>
              <DialogDescription>Enter the classroom name below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Classroom Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Grade 1A"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Creating...' : 'Create Classroom'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Classrooms Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : classrooms && classrooms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <Card key={classroom.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{classroom.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Users className="h-3 w-3" />
                    {classroom.studentCount} students
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(classroom)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedClassroom(classroom);
                      setIsDeleteOpen(true);
                    }}
                  >
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
            <p className="text-muted-foreground mb-4">No classrooms found. Create your first classroom!</p>
            <Button onClick={() => { setName(''); setIsAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Classroom
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Classroom</DialogTitle>
            <DialogDescription>Update the classroom name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Classroom Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classroom?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{selectedClassroom?.name}". Students in this classroom will be unassigned.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClassroom && deleteMutation.mutate(selectedClassroom.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
