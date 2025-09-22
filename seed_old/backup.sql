-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.departments(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['task_assigned'::text, 'task_updated'::text, 'comment_added'::text, 'deadline_reminder'::text])),
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  department_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.roles (
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['staff'::character varying, 'manager'::character varying, 'admin'::character varying]::text[])),
  CONSTRAINT roles_pkey PRIMARY KEY (role)
);
CREATE TABLE public.tags (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying NOT NULL UNIQUE,
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.task_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  user_id uuid,
  assigned_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT task_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id)
);
CREATE TABLE public.task_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  user_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.task_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  tag text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_tags_pkey PRIMARY KEY (id),
  CONSTRAINT task_tags_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'to_do'::text CHECK (status = ANY (ARRAY['to_do'::text, 'in_progress'::text, 'completed'::text, 'blocked'::text])),
  project_id uuid,
  parent_task_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.user_departments (
  user_id uuid NOT NULL,
  department_id bigint NOT NULL,
  CONSTRAINT user_departments_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['staff'::text, 'manager'::text, 'admin'::text])),
  department_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_roles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.user_settings (
  id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  default_view text NOT NULL DEFAULT 'task_view'::text CHECK (default_view = ANY (ARRAY['task_view'::text, 'calendar'::text])),
  mode text NOT NULL DEFAULT 'light'::text CHECK (mode = ANY (ARRAY['light'::text, 'dark'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);