-- Add new columns to students table for detailed information (admin only)
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS mother_name text,
ADD COLUMN IF NOT EXISTS parents_phone text,
ADD COLUMN IF NOT EXISTS rg text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('masculino', 'feminino')),
ADD COLUMN IF NOT EXISTS teacher_name text,
ADD COLUMN IF NOT EXISTS entry_time time,
ADD COLUMN IF NOT EXISTS exit_time time;

-- Add comment for documentation
COMMENT ON COLUMN public.students.birth_date IS 'Data de nascimento do aluno';
COMMENT ON COLUMN public.students.mother_name IS 'Nome da mãe do aluno';
COMMENT ON COLUMN public.students.parents_phone IS 'Telefone dos pais/responsáveis';
COMMENT ON COLUMN public.students.rg IS 'Número do RG do aluno';
COMMENT ON COLUMN public.students.cpf IS 'Número do CPF do aluno';
COMMENT ON COLUMN public.students.gender IS 'Sexo do aluno (masculino/feminino)';
COMMENT ON COLUMN public.students.teacher_name IS 'Nome do professor responsável';
COMMENT ON COLUMN public.students.entry_time IS 'Horário de entrada';
COMMENT ON COLUMN public.students.exit_time IS 'Horário de saída';