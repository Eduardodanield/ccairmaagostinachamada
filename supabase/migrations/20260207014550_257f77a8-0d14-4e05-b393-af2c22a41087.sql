-- Fix search_path on update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix search_path on set_attendance_hours function
CREATE OR REPLACE FUNCTION public.set_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_present = true THEN
        NEW.hours_attended = 8.00;
    ELSE
        NEW.hours_attended = 0;
        NEW.arrival_time = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;