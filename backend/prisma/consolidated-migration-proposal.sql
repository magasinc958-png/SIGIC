-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('RESIDENTE', 'ADMINISTRACION', 'DIRECTIVA');

-- CreateEnum
CREATE TYPE "EstadoAsignacion" AS ENUM ('ACTIVA', 'COMPLETADA', 'CANCELADA', 'REASIGNADA');

-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('PENDIENTE', 'EN_REVISION', 'ASIGNADA', 'EN_PROCESO', 'ATENDIDA', 'RESUELTA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoAccion" AS ENUM ('CREACION', 'CAMBIO_ESTADO', 'ASIGNACION', 'OBSERVACION', 'CIERRE');

-- CreateEnum
CREATE TYPE "EstadoActividad" AS ENUM ('PLANIFICADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PrioridadComunicado" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(25),
    "contrasena_hash" VARCHAR(255) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'RESIDENTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "residente" (
    "id_usuario" BIGINT NOT NULL,
    "manzana" VARCHAR(50) NOT NULL,
    "villa" VARCHAR(50) NOT NULL,
    "numero_casa" VARCHAR(50),
    "calle" VARCHAR(100),
    "referencia_adicional" VARCHAR(255),

    CONSTRAINT "residente_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "administrador" (
    "id_usuario" BIGINT NOT NULL,

    CONSTRAINT "administrador_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "directiva" (
    "id_usuario" BIGINT NOT NULL,
    "cargo" VARCHAR(100) NOT NULL,

    CONSTRAINT "directiva_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "area_operativa" (
    "id_area" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "area_operativa_pkey" PRIMARY KEY ("id_area")
);

-- CreateTable
CREATE TABLE "personal_operativo" (
    "id_operativo" BIGSERIAL NOT NULL,
    "id_area" BIGINT NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "telefono" VARCHAR(25),
    "turno" VARCHAR(50),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "personal_operativo_pkey" PRIMARY KEY ("id_operativo")
);

-- CreateTable
CREATE TABLE "tipo_incidencia" (
    "id_tipo" SMALLSERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "codigo_prefijo" VARCHAR(10) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_incidencia_pkey" PRIMARY KEY ("id_tipo")
);

-- CreateTable
CREATE TABLE "incidencia" (
    "id_incidencia" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(25) NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "id_residente" BIGINT NOT NULL,
    "id_tipo" SMALLINT NOT NULL,
    "estado" "EstadoIncidencia" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_objetivo" TIMESTAMPTZ(6),
    "fecha_resolucion" TIMESTAMPTZ(6),
    "observacion_cierre" TEXT,

    CONSTRAINT "incidencia_pkey" PRIMARY KEY ("id_incidencia")
);

-- CreateTable
CREATE TABLE "ubicacion" (
    "id_ubicacion" BIGSERIAL NOT NULL,
    "id_incidencia" BIGINT NOT NULL,
    "manzana" VARCHAR(50),
    "villa" VARCHAR(50),
    "calle" VARCHAR(100),
    "referencia" VARCHAR(255),
    "latitud" DECIMAL(10,8),
    "longitud" DECIMAL(11,8),

    CONSTRAINT "ubicacion_pkey" PRIMARY KEY ("id_ubicacion")
);

-- CreateTable
CREATE TABLE "adjunto" (
    "id_adjunto" BIGSERIAL NOT NULL,
    "id_incidencia" BIGINT NOT NULL,
    "ruta_archivo" VARCHAR(500) NOT NULL,
    "nombre_archivo" VARCHAR(255),
    "tipo_archivo" VARCHAR(100) NOT NULL,
    "tamano_bytes" BIGINT NOT NULL,
    "fecha_subida" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjunto_pkey" PRIMARY KEY ("id_adjunto")
);

-- CreateTable
CREATE TABLE "historial_incidencia" (
    "id_historial" BIGSERIAL NOT NULL,
    "id_incidencia" BIGINT NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "id_area" BIGINT,
    "id_operativo" BIGINT,
    "tipo_accion" "TipoAccion" NOT NULL,
    "estado_anterior" "EstadoIncidencia",
    "estado_nuevo" "EstadoIncidencia",
    "observacion" TEXT,
    "fecha_evento" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_incidencia_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "asignacion_incidencia" (
    "id_asignacion" BIGSERIAL NOT NULL,
    "id_incidencia" BIGINT NOT NULL,
    "id_area" BIGINT NOT NULL,
    "id_operativo" BIGINT,
    "id_administrador_asignador" BIGINT NOT NULL,
    "estado" "EstadoAsignacion" NOT NULL DEFAULT 'ACTIVA',
    "fecha_inicio" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMPTZ(6),
    "observacion" TEXT,

    CONSTRAINT "asignacion_incidencia_pkey" PRIMARY KEY ("id_asignacion")
);

-- CreateTable
CREATE TABLE "actividad" (
    "id_actividad" BIGSERIAL NOT NULL,
    "id_incidencia" BIGINT,
    "id_usuario_creador" BIGINT NOT NULL,
    "id_operativo" BIGINT,
    "titulo" VARCHAR(160) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoActividad" NOT NULL DEFAULT 'PLANIFICADA',
    "fecha_programada" TIMESTAMPTZ(6),
    "fecha_inicio" TIMESTAMPTZ(6),
    "fecha_finalizacion" TIMESTAMPTZ(6),
    "fecha_creacion" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividad_pkey" PRIMARY KEY ("id_actividad")
);

-- CreateTable
CREATE TABLE "comunicado" (
    "id_comunicado" BIGSERIAL NOT NULL,
    "id_administrador" BIGINT NOT NULL,
    "id_incidencia" BIGINT,
    "id_actividad" BIGINT,
    "titulo" VARCHAR(160) NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_publicacion" TIMESTAMPTZ(6),
    "prioridad" "PrioridadComunicado" NOT NULL DEFAULT 'NORMAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comunicado_pkey" PRIMARY KEY ("id_comunicado")
);

-- CreateTable
CREATE TABLE "auditoria_sistema" (
    "id_auditoria" BIGSERIAL NOT NULL,
    "id_usuario" BIGINT,
    "accion" VARCHAR(80) NOT NULL,
    "entidad" VARCHAR(80),
    "id_registro" BIGINT,
    "resultado" VARCHAR(20) NOT NULL,
    "detalle" JSONB,
    "direccion_ip" VARCHAR(45),
    "user_agent" TEXT,
    "fecha_evento" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_sistema_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_rol_activo_idx" ON "usuario"("rol", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "area_operativa_nombre_key" ON "area_operativa"("nombre");

-- CreateIndex
CREATE INDEX "personal_operativo_id_area_idx" ON "personal_operativo"("id_area");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_incidencia_nombre_key" ON "tipo_incidencia"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_incidencia_codigo_prefijo_key" ON "tipo_incidencia"("codigo_prefijo");

-- CreateIndex
CREATE UNIQUE INDEX "incidencia_codigo_key" ON "incidencia"("codigo");

-- CreateIndex
CREATE INDEX "incidencia_id_residente_idx" ON "incidencia"("id_residente");

-- CreateIndex
CREATE INDEX "incidencia_id_tipo_idx" ON "incidencia"("id_tipo");

-- CreateIndex
CREATE INDEX "incidencia_estado_fecha_creacion_idx" ON "incidencia"("estado", "fecha_creacion");

-- CreateIndex
CREATE UNIQUE INDEX "ubicacion_id_incidencia_key" ON "ubicacion"("id_incidencia");

-- CreateIndex
CREATE INDEX "adjunto_id_incidencia_idx" ON "adjunto"("id_incidencia");

-- CreateIndex
CREATE INDEX "historial_incidencia_id_incidencia_fecha_evento_idx" ON "historial_incidencia"("id_incidencia", "fecha_evento");

-- CreateIndex
CREATE INDEX "historial_incidencia_id_usuario_idx" ON "historial_incidencia"("id_usuario");

-- CreateIndex
CREATE INDEX "historial_incidencia_id_area_idx" ON "historial_incidencia"("id_area");

-- CreateIndex
CREATE INDEX "historial_incidencia_id_operativo_idx" ON "historial_incidencia"("id_operativo");

-- CreateIndex
CREATE INDEX "asignacion_incidencia_id_incidencia_fecha_fin_idx" ON "asignacion_incidencia"("id_incidencia", "fecha_fin");

-- CreateIndex
CREATE INDEX "asignacion_incidencia_id_incidencia_estado_fecha_fin_idx" ON "asignacion_incidencia"("id_incidencia", "estado", "fecha_fin");

-- CreateIndex
CREATE INDEX "asignacion_incidencia_id_area_fecha_fin_idx" ON "asignacion_incidencia"("id_area", "fecha_fin");

-- CreateIndex
CREATE INDEX "asignacion_incidencia_id_operativo_fecha_fin_idx" ON "asignacion_incidencia"("id_operativo", "fecha_fin");

-- CreateIndex
CREATE INDEX "asignacion_incidencia_id_administrador_asignador_fecha_inic_idx" ON "asignacion_incidencia"("id_administrador_asignador", "fecha_inicio");

-- CreateIndex
CREATE INDEX "actividad_id_incidencia_idx" ON "actividad"("id_incidencia");

-- CreateIndex
CREATE INDEX "actividad_id_usuario_creador_idx" ON "actividad"("id_usuario_creador");

-- CreateIndex
CREATE INDEX "actividad_id_operativo_idx" ON "actividad"("id_operativo");

-- CreateIndex
CREATE INDEX "actividad_estado_fecha_programada_idx" ON "actividad"("estado", "fecha_programada");

-- CreateIndex
CREATE INDEX "comunicado_id_administrador_idx" ON "comunicado"("id_administrador");

-- CreateIndex
CREATE INDEX "comunicado_id_incidencia_idx" ON "comunicado"("id_incidencia");

-- CreateIndex
CREATE INDEX "comunicado_id_actividad_idx" ON "comunicado"("id_actividad");

-- CreateIndex
CREATE INDEX "comunicado_activo_fecha_publicacion_idx" ON "comunicado"("activo", "fecha_publicacion");

-- CreateIndex
CREATE INDEX "auditoria_sistema_id_usuario_fecha_evento_idx" ON "auditoria_sistema"("id_usuario", "fecha_evento");

-- CreateIndex
CREATE INDEX "auditoria_sistema_entidad_id_registro_idx" ON "auditoria_sistema"("entidad", "id_registro");

-- CreateIndex
CREATE INDEX "auditoria_sistema_fecha_evento_idx" ON "auditoria_sistema"("fecha_evento");

-- AddForeignKey
ALTER TABLE "residente" ADD CONSTRAINT "residente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrador" ADD CONSTRAINT "administrador_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directiva" ADD CONSTRAINT "directiva_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_operativo" ADD CONSTRAINT "personal_operativo_id_area_fkey" FOREIGN KEY ("id_area") REFERENCES "area_operativa"("id_area") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia" ADD CONSTRAINT "incidencia_id_residente_fkey" FOREIGN KEY ("id_residente") REFERENCES "residente"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia" ADD CONSTRAINT "incidencia_id_tipo_fkey" FOREIGN KEY ("id_tipo") REFERENCES "tipo_incidencia"("id_tipo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicacion" ADD CONSTRAINT "ubicacion_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "incidencia"("id_incidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjunto" ADD CONSTRAINT "adjunto_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "incidencia"("id_incidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_incidencia" ADD CONSTRAINT "historial_incidencia_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "incidencia"("id_incidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_incidencia" ADD CONSTRAINT "historial_incidencia_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_incidencia" ADD CONSTRAINT "historial_incidencia_id_area_fkey" FOREIGN KEY ("id_area") REFERENCES "area_operativa"("id_area") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_incidencia" ADD CONSTRAINT "historial_incidencia_id_operativo_fkey" FOREIGN KEY ("id_operativo") REFERENCES "personal_operativo"("id_operativo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_incidencia" ADD CONSTRAINT "asignacion_incidencia_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "incidencia"("id_incidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_incidencia" ADD CONSTRAINT "asignacion_incidencia_id_area_fkey" FOREIGN KEY ("id_area") REFERENCES "area_operativa"("id_area") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_incidencia" ADD CONSTRAINT "asignacion_incidencia_id_operativo_fkey" FOREIGN KEY ("id_operativo") REFERENCES "personal_operativo"("id_operativo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_incidencia" ADD CONSTRAINT "asignacion_incidencia_id_administrador_asignador_fkey" FOREIGN KEY ("id_administrador_asignador") REFERENCES "administrador"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "incidencia"("id_incidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_id_usuario_creador_fkey" FOREIGN KEY ("id_usuario_creador") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividad" ADD CONSTRAINT "actividad_id_operativo_fkey" FOREIGN KEY ("id_operativo") REFERENCES "personal_operativo"("id_operativo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_id_administrador_fkey" FOREIGN KEY ("id_administrador") REFERENCES "administrador"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "incidencia"("id_incidencia") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicado" ADD CONSTRAINT "comunicado_id_actividad_fkey" FOREIGN KEY ("id_actividad") REFERENCES "actividad"("id_actividad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_sistema" ADD CONSTRAINT "auditoria_sistema_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SIGIC custom constraints (not expressible in Prisma schema alone)
ALTER TABLE "asignacion_incidencia"
  ADD CONSTRAINT "asignacion_incidencia_fechas_ck"
  CHECK ("fecha_fin" IS NULL OR "fecha_fin" >= "fecha_inicio");

ALTER TABLE "asignacion_incidencia"
  ADD CONSTRAINT "asignacion_incidencia_estado_fecha_fin_ck"
  CHECK (
    ("estado" = 'ACTIVA' AND "fecha_fin" IS NULL)
    OR
    ("estado" IN ('COMPLETADA', 'CANCELADA', 'REASIGNADA') AND "fecha_fin" IS NOT NULL)
  );

CREATE UNIQUE INDEX "asignacion_incidencia_activa_trabajador_key"
  ON "asignacion_incidencia" ("id_incidencia", "id_operativo")
  WHERE "estado" = 'ACTIVA' AND "id_operativo" IS NOT NULL;

CREATE UNIQUE INDEX "asignacion_incidencia_activa_area_sin_trabajador_key"
  ON "asignacion_incidencia" ("id_incidencia", "id_area")
  WHERE "estado" = 'ACTIVA' AND "id_operativo" IS NULL;

ALTER TABLE "ubicacion"
  ADD CONSTRAINT "ubicacion_latitud_ck"
  CHECK ("latitud" IS NULL OR "latitud" BETWEEN -90 AND 90);

ALTER TABLE "ubicacion"
  ADD CONSTRAINT "ubicacion_longitud_ck"
  CHECK ("longitud" IS NULL OR "longitud" BETWEEN -180 AND 180);

ALTER TABLE "ubicacion"
  ADD CONSTRAINT "ubicacion_coordenadas_completas_ck"
  CHECK (("latitud" IS NULL) = ("longitud" IS NULL));
