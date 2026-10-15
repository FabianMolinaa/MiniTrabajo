-- ==============================================================================
-- MIGRACIÓN DE SUPABASE: SISTEMA DE RESEÑAS Y CALIFICACIONES MUTUAS
-- Proyecto: MiniTrabajo (Pololitos)
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase.
-- Este script es seguro e idempotente (usa IF NOT EXISTS y verificaciones).
-- ==============================================================================

-- 1. Crear tabla 'resenas' si no existe
CREATE TABLE IF NOT EXISTS public.resenas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id UUID,
    autor_id UUID NOT NULL,
    evaluado_id UUID NOT NULL,
    usuario_evaluado_id UUID,
    calificacion INTEGER NOT NULL DEFAULT 5 CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas si la tabla ya existía previamente con otro esquema
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'evaluado_id') THEN
        ALTER TABLE public.resenas ADD COLUMN evaluado_id UUID;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'usuario_evaluado_id') THEN
        ALTER TABLE public.resenas ADD COLUMN usuario_evaluado_id UUID;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'trabajo_id') THEN
        ALTER TABLE public.resenas ADD COLUMN trabajo_id UUID;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'autor_id') THEN
        ALTER TABLE public.resenas ADD COLUMN autor_id UUID;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'calificacion') THEN
        ALTER TABLE public.resenas ADD COLUMN calificacion INTEGER DEFAULT 5;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'comentario') THEN
        ALTER TABLE public.resenas ADD COLUMN comentario TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'created_at') THEN
        ALTER TABLE public.resenas ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;

    -- Agregar columna 'estado' para evitar errores de triggers que evalúan NEW.estado
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'resenas' AND column_name = 'estado') THEN
        ALTER TABLE public.resenas ADD COLUMN estado TEXT DEFAULT 'publicado';
    END IF;
END $$;

-- 2. Asegurar columnas de calificación y métricas en tabla 'perfiles'
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'calificacion') THEN
        ALTER TABLE public.perfiles ADD COLUMN calificacion NUMERIC(3, 1) DEFAULT 0.0;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'total_resenas') THEN
        ALTER TABLE public.perfiles ADD COLUMN total_resenas INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'trabajos_realizados') THEN
        ALTER TABLE public.perfiles ADD COLUMN trabajos_realizados INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfiles' AND column_name = 'estado') THEN
        ALTER TABLE public.perfiles ADD COLUMN estado TEXT DEFAULT 'activo';
    END IF;
END $$;

-- Limpieza de triggers erróneos en 'resenas' que hayan sido asociados por accidente
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'resenas' 
          AND trigger_name != 'trigger_actualizar_promedio_perfil'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.resenas CASCADE;';
    END LOOP;
END $$;

-- 3. Índices de rendimiento para lecturas de perfil y muro
CREATE INDEX IF NOT EXISTS idx_resenas_evaluado ON public.resenas(evaluado_id);
CREATE INDEX IF NOT EXISTS idx_resenas_usuario_evaluado ON public.resenas(usuario_evaluado_id);
CREATE INDEX IF NOT EXISTS idx_resenas_autor ON public.resenas(autor_id);
CREATE INDEX IF NOT EXISTS idx_resenas_trabajo ON public.resenas(trabajo_id);

-- 4. Función y Trigger opcional para sincronizar promedios automáticamente
CREATE OR REPLACE FUNCTION public.actualizar_promedio_perfil()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID;
    nuevo_promedio NUMERIC(3, 1);
    conteo INTEGER;
BEGIN
    target_id := COALESCE(NEW.evaluado_id, NEW.usuario_evaluado_id);
    
    IF target_id IS NOT NULL THEN
        SELECT COALESCE(ROUND(AVG(calificacion)::numeric, 1), 0.0), COUNT(*)
        INTO nuevo_promedio, conteo
        FROM public.resenas
        WHERE evaluado_id = target_id OR usuario_evaluado_id = target_id;

        UPDATE public.perfiles
        SET calificacion = nuevo_promedio,
            total_resenas = conteo
        WHERE id = target_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_promedio_perfil ON public.resenas;
CREATE TRIGGER trigger_actualizar_promedio_perfil
AFTER INSERT OR UPDATE ON public.resenas
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_promedio_perfil();

-- 5. Habilitar RLS básico permitiendo a usuarios autenticados leer e insertar reseñas
ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Lectura pública de reseñas" ON public.resenas;
    CREATE POLICY "Lectura pública de reseñas" ON public.resenas
        FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Inserción de reseñas por usuarios autenticados" ON public.resenas;
    CREATE POLICY "Inserción de reseñas por usuarios autenticados" ON public.resenas
        FOR INSERT WITH CHECK (auth.uid() = autor_id);

    DROP POLICY IF EXISTS "Actualización de reseñas propias" ON public.resenas;
    CREATE POLICY "Actualización de reseñas propias" ON public.resenas
        FOR UPDATE USING (auth.uid() = autor_id);
END $$;
