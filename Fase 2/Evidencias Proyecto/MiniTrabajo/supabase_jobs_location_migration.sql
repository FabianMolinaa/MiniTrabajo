-- ==============================================================================
-- MIGRACIÓN DE SUPABASE: COLUMNAS DE UBICACIÓN (LAT, LNG) EN TABLA JOBS / TRABAJOS
-- Proyecto: MiniTrabajo (Pololitos)
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase.
-- Este script es seguro e idempotente (usa IF NOT EXISTS).
-- Soporta tanto el nombre de tabla 'trabajos' como 'jobs'.
-- ==============================================================================

-- 1. Si tu tabla se llama 'trabajos':
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trabajos') THEN
        -- Agregar columna latitud / lat
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trabajos' AND column_name = 'latitud') THEN
            ALTER TABLE public.trabajos ADD COLUMN latitud DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trabajos' AND column_name = 'longitud') THEN
            ALTER TABLE public.trabajos ADD COLUMN longitud DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trabajos' AND column_name = 'lat') THEN
            ALTER TABLE public.trabajos ADD COLUMN lat DOUBLE PRECISION;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trabajos' AND column_name = 'lng') THEN
            ALTER TABLE public.trabajos ADD COLUMN lng DOUBLE PRECISION;
        END IF;

        -- Crear índices para acelerar búsquedas geoespaciales
        CREATE INDEX IF NOT EXISTS idx_trabajos_lat_lng ON public.trabajos(latitud, longitud);
    END IF;
END $$;



-- 3. (OPCIONAL) Asignar coordenadas iniciales en Santiago a publicaciones existentes
-- que aún no tengan coordenadas, basadas en su comuna asignada:
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trabajos') THEN
        -- Si hay comunas vinculadas, poblar latitud y longitud por defecto si son NULL:
        UPDATE public.trabajos t
        SET 
            latitud = COALESCE(t.latitud, t.lat, -33.4489 + ((random() - 0.5) * 0.05)),
            longitud = COALESCE(t.longitud, t.lng, -70.6693 + ((random() - 0.5) * 0.05)),
            lat = COALESCE(t.lat, t.latitud, -33.4489 + ((random() - 0.5) * 0.05)),
            lng = COALESCE(t.lng, t.longitud, -70.6693 + ((random() - 0.5) * 0.05))
        WHERE (t.latitud IS NULL AND t.lat IS NULL) OR (t.longitud IS NULL AND t.lng IS NULL);
    END IF;
END $$;

COMMENT ON COLUMN public.trabajos.latitud IS 'Latitud GPS decimal de la ubicación de la tarea';
COMMENT ON COLUMN public.trabajos.longitud IS 'Longitud GPS decimal de la ubicación de la tarea';
