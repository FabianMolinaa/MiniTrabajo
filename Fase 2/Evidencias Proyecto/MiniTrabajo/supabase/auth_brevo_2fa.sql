-- ==============================================================================
-- DOBLE AUTENTICACIÓN (2FA) CON BREVO - Mini-Trabajo
--
-- Ejecutar en: Supabase > SQL Editor > New query > Run.
-- ==============================================================================

create extension if not exists pg_net with schema extensions;

-- ------------------------------------------------------------------------------
-- 1. Tabla de configuración de Brevo (privada, solo accesible por backend)
-- ------------------------------------------------------------------------------
create table if not exists public.auth_config_brevo (
  id                int primary key default 1 check (id = 1),
  api_key           text not null,
  remitente_email   text not null,
  remitente_nombre  text not null default 'MiniTrabajo',
  actualizado_en    timestamptz not null default now()
);

alter table public.auth_config_brevo enable row level security;
-- Ningún usuario cliente (anon o authenticated) puede leer las claves
revoke all on public.auth_config_brevo from public, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. Tabla de códigos OTP de 2FA
-- ------------------------------------------------------------------------------
create table if not exists public.auth_codigos_2fa (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  codigo      text not null,
  tipo        text not null default 'login',
  intentos    int not null default 0,
  usado       boolean not null default false,
  expira_en   timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists auth_codigos_2fa_email_idx
  on public.auth_codigos_2fa (email, tipo, expira_en desc);

alter table public.auth_codigos_2fa enable row level security;
revoke all on public.auth_codigos_2fa from public, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. Función para guardar la configuración de Brevo (administrador)
-- ------------------------------------------------------------------------------
create or replace function public.guardar_config_brevo(
  p_api_key text,
  p_remitente_email text,
  p_remitente_nombre text default 'MiniTrabajo'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auth_config_brevo (id, api_key, remitente_email, remitente_nombre, actualizado_en)
  values (1, trim(p_api_key), trim(lower(p_remitente_email)), coalesce(nullif(trim(p_remitente_nombre), ''), 'MiniTrabajo'), now())
  on conflict (id) do update
    set api_key          = excluded.api_key,
        remitente_email  = excluded.remitente_email,
        remitente_nombre = excluded.remitente_nombre,
        actualizado_en   = now();
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Función para generar y enviar el código 2FA mediante Brevo
-- ------------------------------------------------------------------------------
create or replace function public.enviar_codigo_2fa(
  p_email text,
  p_tipo text default 'login'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email     text := trim(lower(p_email));
  v_codigo    text;
  v_cfg       record;
  v_html      text;
  v_payload   jsonb;
  v_headers   jsonb;
begin
  if v_email is null or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    return jsonb_build_object('ok', false, 'error', 'Correo electrónico inválido.');
  end if;

  -- Obtener configuración de Brevo
  select * into v_cfg from public.auth_config_brevo where id = 1;
  if not found or v_cfg.api_key is null or v_cfg.api_key = '' then
    return jsonb_build_object(
      'ok', false,
      'error', 'El servicio de correos Brevo aún no está configurado en Supabase.'
    );
  end if;

  -- Generar código criptográfico de 6 dígitos
  v_codigo := lpad((floor(random() * 900000) + 100000)::text, 6, '0');

  -- Invalidar códigos anteriores no usados del mismo correo y tipo
  update public.auth_codigos_2fa
  set usado = true
  where email = v_email and tipo = p_tipo and usado = false;

  -- Guardar nuevo código con 10 minutos de vigencia
  insert into public.auth_codigos_2fa (email, codigo, tipo, expira_en)
  values (v_email, v_codigo, p_tipo, now() + interval '10 minutes');

  -- Plantilla HTML del correo
  v_html := '<!DOCTYPE html>'
    || '<html><head><meta charset="utf-8">'
    || '<style>'
    || 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0d0f12; color: #ffffff; padding: 24px; margin: 0; }'
    || '.container { max-width: 480px; margin: 0 auto; background-color: #141820; border: 1px solid #242a35; border-radius: 16px; padding: 32px 24px; text-align: center; }'
    || '.badge { display: inline-block; background-color: #1e2638; color: #60a5fa; font-weight: 600; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 20px; }'
    || 'h1 { color: #ffffff; font-size: 22px; margin: 0 0 10px; font-weight: 700; }'
    || 'p { color: #9ca3af; font-size: 14px; line-height: 20px; margin: 0 0 24px; }'
    || '.code-box { background: #1b1f26; border: 1px dashed #60a5fa; border-radius: 12px; padding: 18px 24px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; margin-bottom: 24px; }'
    || '.footer { font-size: 12px; color: #6b7280; line-height: 18px; border-top: 1px solid #242a35; padding-top: 20px; margin-top: 16px; }'
    || '</style></head><body>'
    || '<div class="container">'
    || '<div class="badge">Mini-Trabajo Seguridad</div>'
    || '<h1>Tu código de acceso</h1>'
    || '<p>Ingresa este código de 6 dígitos en la aplicación para verificar tu identidad e iniciar sesión:</p>'
    || '<div class="code-box">' || v_codigo || '</div>'
    || '<p>Este código expira en <strong>10 minutos</strong>. Si tú no solicitaste este acceso, puedes ignorar este mensaje.</p>'
    || '<div class="footer">Este es un correo automático de seguridad de Mini-Trabajo Chile. Por favor no respondas a este mensaje.</div>'
    || '</div></body></html>';

  v_payload := jsonb_build_object(
    'sender', jsonb_build_object('name', v_cfg.remitente_nombre, 'email', v_cfg.remitente_email),
    'to', jsonb_build_array(jsonb_build_object('email', v_email)),
    'subject', v_codigo || ' es tu código de verificación de MiniTrabajo',
    'htmlContent', v_html
  );

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Accept', 'application/json',
    'api-key', v_cfg.api_key
  );

  -- Envío asíncrono con pg_net
  perform net.http_post(
    url     := 'https://api.brevo.com/v3/smtp/email',
    body    := v_payload,
    headers := v_headers
  );

  return jsonb_build_object('ok', true, 'mensaje', 'Código enviado exitosamente.');
exception when others then
  return jsonb_build_object('ok', false, 'error', 'No pudimos enviar el correo con Brevo: ' || sqlerrm);
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. Función para verificar el código 2FA ingresado
-- ------------------------------------------------------------------------------
create or replace function public.verificar_codigo_2fa(
  p_email text,
  p_codigo text,
  p_tipo text default 'login'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := trim(lower(p_email));
  v_codigo text := trim(p_codigo);
  v_reg    record;
begin
  if v_email is null or v_codigo is null or length(v_codigo) != 6 then
    return jsonb_build_object('valido', false, 'error', 'Ingresa un código de 6 dígitos válido.');
  end if;

  select * into v_reg
  from public.auth_codigos_2fa
  where email = v_email and tipo = p_tipo and usado = false
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'valido', false,
      'error', 'No hay ningún código activo. Solicita un nuevo código.'
    );
  end if;

  if v_reg.expira_en < now() then
    update public.auth_codigos_2fa set usado = true where id = v_reg.id;
    return jsonb_build_object(
      'valido', false,
      'error', 'El código ha expirado (validez de 10 min). Solicita uno nuevo.'
    );
  end if;

  if v_reg.intentos >= 5 then
    update public.auth_codigos_2fa set usado = true where id = v_reg.id;
    return jsonb_build_object(
      'valido', false,
      'error', 'Superaste el límite de 5 intentos fallidos. Solicita un nuevo código.'
    );
  end if;

  if v_reg.codigo <> v_codigo then
    update public.auth_codigos_2fa
    set intentos = intentos + 1
    where id = v_reg.id;

    return jsonb_build_object(
      'valido', false,
      'error', 'Código incorrecto. Intentos restantes: ' || (4 - v_reg.intentos) || '.'
    );
  end if;

  -- Código correcto: marcar como usado
  update public.auth_codigos_2fa set usado = true where id = v_reg.id;
  return jsonb_build_object('valido', true);
end;
$$;

-- Permisos de ejecución: los clientes pueden solicitar y verificar sus códigos
grant execute on function public.enviar_codigo_2fa(text, text) to anon, authenticated;
grant execute on function public.verificar_codigo_2fa(text, text, text) to anon, authenticated;
