-- ==============================================================================
-- NOTIFICACIONES - Mini-Trabajo
--
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run.
-- El script es idempotente: se puede volver a ejecutar sin duplicar objetos.
--
-- Crea:
--   1. Tabla `notificaciones` (bandeja dentro de la app, con RLS y Realtime).
--   2. Tabla `push_tokens` (tokens Expo de cada dispositivo) + RPCs para registrarlos.
--   3. Triggers que generan notificaciones automáticamente cuando:
--        - alguien se postula a una publicación     -> avisa al publicador
--        - una postulación es aceptada / rechazada  -> avisa al postulante
--        - se recibe una calificación               -> avisa al evaluado
--        - se acredita una compra de créditos       -> avisa al comprador
--   4. Trigger que envía la notificación push vía Expo Push API (pg_net).
-- ==============================================================================

create extension if not exists pg_net with schema extensions;

-- ------------------------------------------------------------------------------
-- 1. Tabla de notificaciones
-- ------------------------------------------------------------------------------
create table if not exists public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  tipo        text not null check (tipo in (
                'nueva_postulacion',
                'postulacion_aceptada',
                'postulacion_rechazada',
                'acuerdo_cancelado',
                'calificacion_recibida',
                'compra_aprobada'
              )),
  titulo      text not null,
  mensaje     text not null,
  datos       jsonb not null default '{}'::jsonb,
  leida       boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Por si la tabla ya existía previamente en Supabase con otra estructura:
alter table if exists public.notificaciones
  add column if not exists usuario_id uuid references auth.users (id) on delete cascade,
  add column if not exists tipo text,
  add column if not exists titulo text,
  add column if not exists mensaje text,
  add column if not exists datos jsonb not null default '{}'::jsonb,
  add column if not exists leida boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'notificaciones' and column_name = 'user_id'
  ) then
    execute 'update public.notificaciones set usuario_id = user_id where usuario_id is null';
  end if;
end $$;

create index if not exists notificaciones_usuario_fecha_idx
  on public.notificaciones (usuario_id, created_at desc);

alter table public.notificaciones enable row level security;

drop policy if exists "notificaciones_select_propias" on public.notificaciones;
create policy "notificaciones_select_propias"
  on public.notificaciones for select
  to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "notificaciones_update_propias" on public.notificaciones;
create policy "notificaciones_update_propias"
  on public.notificaciones for update
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Los clientes solo pueden leer y marcar como leída. Nadie inserta desde la app:
-- las notificaciones las crean exclusivamente los triggers (security definer).
revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;
grant update (leida) on public.notificaciones to authenticated;

-- Habilitar Realtime para que la campana se actualice al instante.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. Tokens push (Expo) por dispositivo
-- ------------------------------------------------------------------------------
create table if not exists public.push_tokens (
  token           text primary key,
  usuario_id      uuid not null references auth.users (id) on delete cascade,
  plataforma      text,
  actualizado_en  timestamptz not null default now()
);

create index if not exists push_tokens_usuario_idx on public.push_tokens (usuario_id);

alter table public.push_tokens enable row level security;
-- Sin políticas: la tabla solo se gestiona mediante las RPC de abajo.
revoke all on public.push_tokens from anon, authenticated;

create or replace function public.registrar_push_token(p_token text, p_plataforma text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  if p_token is null or p_token !~ '^(Expo|Exponent)PushToken\[.+\]$' then
    raise exception 'Token push inválido.' using errcode = '22023';
  end if;

  -- Si el dispositivo cambió de cuenta, el token pasa al usuario actual.
  insert into public.push_tokens (token, usuario_id, plataforma, actualizado_en)
  values (p_token, auth.uid(), left(p_plataforma, 20), now())
  on conflict (token) do update
    set usuario_id     = excluded.usuario_id,
        plataforma     = excluded.plataforma,
        actualizado_en = now();
end;
$$;

create or replace function public.eliminar_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_tokens
  where token = p_token and usuario_id = auth.uid();
end;
$$;

revoke all on function public.registrar_push_token(text, text) from public, anon;
revoke all on function public.eliminar_push_token(text) from public, anon;
grant execute on function public.registrar_push_token(text, text) to authenticated;
grant execute on function public.eliminar_push_token(text) to authenticated;

-- ------------------------------------------------------------------------------
-- 3. Función auxiliar para crear notificaciones (uso interno de triggers)
-- ------------------------------------------------------------------------------
create or replace function public.crear_notificacion(
  p_usuario_id uuid,
  p_tipo text,
  p_titulo text,
  p_mensaje text,
  p_datos jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null then
    return;
  end if;

  insert into public.notificaciones (usuario_id, tipo, titulo, mensaje, datos)
  values (p_usuario_id, p_tipo, p_titulo, p_mensaje, coalesce(p_datos, '{}'::jsonb));
end;
$$;

revoke all on function public.crear_notificacion(uuid, text, text, text, jsonb)
  from public, anon, authenticated;

-- Nombre visible de un perfil.
create or replace function public.nombre_visible_perfil(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(p.nombre, ''), nullif(p.nombre_completo, ''), 'Alguien')
  from public.perfiles p
  where p.id = p_id;
$$;

revoke all on function public.nombre_visible_perfil(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3a. Nueva postulación -> avisa al dueño del trabajo
-- ------------------------------------------------------------------------------
create or replace function public.trg_notificar_nueva_postulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dueno  uuid;
  v_titulo text;
begin
  select t.user_id, t.titulo into v_dueno, v_titulo
  from public.trabajos t
  where t.id = new.trabajo_id;

  if v_dueno is null or v_dueno = new.postulante_id then
    return new;
  end if;

  perform public.crear_notificacion(
    v_dueno,
    'nueva_postulacion',
    'Nueva postulación',
    coalesce(public.nombre_visible_perfil(new.postulante_id), 'Alguien')
      || ' se postuló a "' || coalesce(v_titulo, 'tu publicación') || '".',
    jsonb_build_object('trabajo_id', new.trabajo_id, 'postulacion_id', new.id)
  );

  return new;
exception when others then
  raise warning 'No se pudo crear la notificación de postulación: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notificar_nueva_postulacion on public.postulaciones;
create trigger notificar_nueva_postulacion
  after insert on public.postulaciones
  for each row execute function public.trg_notificar_nueva_postulacion();

-- ------------------------------------------------------------------------------
-- 3b. Postulación aceptada / rechazada / acuerdo cancelado -> avisa al postulante
-- ------------------------------------------------------------------------------
create or replace function public.trg_notificar_estado_postulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titulo text;
  v_datos  jsonb;
begin
  if new.estado is not distinct from old.estado then
    return new;
  end if;

  select t.titulo into v_titulo from public.trabajos t where t.id = new.trabajo_id;
  v_titulo := coalesce(v_titulo, 'una tarea');
  v_datos  := jsonb_build_object('trabajo_id', new.trabajo_id, 'postulacion_id', new.id);

  if new.estado = 'aceptado' then
    perform public.crear_notificacion(
      new.postulante_id,
      'postulacion_aceptada',
      '¡Te aceptaron!',
      'Fuiste seleccionado para "' || v_titulo || '". Coordina los detalles con el publicador.',
      v_datos
    );
  elsif new.estado = 'rechazado' and old.estado = 'aceptado' then
    perform public.crear_notificacion(
      new.postulante_id,
      'acuerdo_cancelado',
      'Acuerdo cancelado',
      'El publicador canceló el acuerdo de "' || v_titulo || '".',
      v_datos
    );
  elsif new.estado = 'rechazado' then
    perform public.crear_notificacion(
      new.postulante_id,
      'postulacion_rechazada',
      'Postulación no seleccionada',
      'Tu postulación a "' || v_titulo || '" no fue seleccionada esta vez.',
      v_datos
    );
  end if;

  return new;
exception when others then
  raise warning 'No se pudo crear la notificación de estado: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notificar_estado_postulacion on public.postulaciones;
create trigger notificar_estado_postulacion
  after update of estado on public.postulaciones
  for each row execute function public.trg_notificar_estado_postulacion();

-- ------------------------------------------------------------------------------
-- 3c. Calificación recibida -> avisa al evaluado
-- (la tabla `resenas` usa `usuario_evaluado_id` y/o `evaluado_id`; se leen ambas)
-- ------------------------------------------------------------------------------
create or replace function public.trg_notificar_calificacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila      jsonb := to_jsonb(new);
  v_evaluado  uuid;
  v_autor     uuid;
  v_estrellas text;
begin
  v_evaluado := coalesce(
    nullif(v_fila ->> 'usuario_evaluado_id', ''),
    nullif(v_fila ->> 'evaluado_id', '')
  )::uuid;
  v_autor := nullif(v_fila ->> 'autor_id', '')::uuid;

  if v_evaluado is null or v_evaluado = v_autor then
    return new;
  end if;

  v_estrellas := coalesce(v_fila ->> 'calificacion', '?');

  perform public.crear_notificacion(
    v_evaluado,
    'calificacion_recibida',
    'Calificación recibida',
    coalesce(public.nombre_visible_perfil(v_autor), 'Alguien')
      || ' te calificó con ' || v_estrellas
      || case when v_estrellas = '1' then ' estrella.' else ' estrellas.' end,
    jsonb_build_object('trabajo_id', v_fila ->> 'trabajo_id', 'resena_id', v_fila ->> 'id')
  );

  return new;
exception when others then
  raise warning 'No se pudo crear la notificación de calificación: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notificar_calificacion on public.resenas;
create trigger notificar_calificacion
  after insert on public.resenas
  for each row execute function public.trg_notificar_calificacion();

-- ------------------------------------------------------------------------------
-- 3d. Compra de créditos acreditada -> avisa al comprador
-- ------------------------------------------------------------------------------
create or replace function public.trg_notificar_compra_aprobada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado <> 'aprobado' or new.acreditado_en is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.acreditado_en is not null then
    return new; -- ya se había notificado
  end if;

  perform public.crear_notificacion(
    new.usuario_id,
    'compra_aprobada',
    'Compra confirmada',
    'Agregamos ' || new.creditos || ' créditos a tu saldo. ¡Ya puedes destacar tus publicaciones!',
    jsonb_build_object('compra_id', new.id, 'creditos', new.creditos)
  );

  return new;
exception when others then
  raise warning 'No se pudo crear la notificación de compra: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notificar_compra_aprobada on public.compras_creditos;
create trigger notificar_compra_aprobada
  after insert or update of estado, acreditado_en on public.compras_creditos
  for each row execute function public.trg_notificar_compra_aprobada();

-- ------------------------------------------------------------------------------
-- 4. Envío push a todos los dispositivos del usuario (Expo Push API)
--    pg_net envía la petición de forma asíncrona tras el commit.
-- ------------------------------------------------------------------------------
create or replace function public.trg_enviar_push_notificacion()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_mensajes jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', pt.token,
           'title', new.titulo,
           'body', new.mensaje,
           'sound', 'default',
           'channelId', 'default',
           'priority', 'high',
           'data', coalesce(new.datos, '{}'::jsonb)
                   || jsonb_build_object('notificacion_id', new.id, 'tipo', new.tipo)
         ))
    into v_mensajes
  from public.push_tokens pt
  where pt.usuario_id = new.usuario_id;

  if v_mensajes is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := v_mensajes,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Accept', 'application/json'
               )
  );

  return new;
exception when others then
  raise warning 'No se pudo enviar la notificación push: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists enviar_push_notificacion on public.notificaciones;
create trigger enviar_push_notificacion
  after insert on public.notificaciones
  for each row execute function public.trg_enviar_push_notificacion();

revoke all on function public.trg_notificar_nueva_postulacion() from public, anon, authenticated;
revoke all on function public.trg_notificar_estado_postulacion() from public, anon, authenticated;
revoke all on function public.trg_notificar_calificacion() from public, anon, authenticated;
revoke all on function public.trg_notificar_compra_aprobada() from public, anon, authenticated;
revoke all on function public.trg_enviar_push_notificacion() from public, anon, authenticated;
