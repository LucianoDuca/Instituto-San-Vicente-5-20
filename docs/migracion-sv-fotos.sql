-- ============================================================
-- Migración de datos: separar las "fotos sueltas" de los sliders
-- Correr UNA vez en Supabase (SQL Editor) tras deployar los cambios de
-- imágenes variables. Es seguro: si no existen filas para esos slots,
-- las sentencias no hacen nada (no-op).
--
-- Contexto: los niveles e inglés mezclaban el slider + una foto suelta
-- bajo la misma "seccion". Ahora el slider es una sección dinámica pura y
-- la foto suelta pasa a su propia sección fija "*-foto". Si algún admin
-- ya había reemplazado esas fotos desde el panel, hay que mover esas
-- filas para que no aparezcan como un slide de más.
-- ============================================================

update sv_imagenes set seccion = 'kinder-foto',     slot = 1 where seccion = 'kinder'      and slot = 5;
update sv_imagenes set seccion = 'primario-foto',   slot = 1 where seccion = 'primario'    and slot = 5;
update sv_imagenes set seccion = 'secundario-foto', slot = 1 where seccion = 'secundario'  and slot = 4;
update sv_imagenes set seccion = 'ingles-foto',     slot = 1 where seccion = 'ingles'      and slot = 4;
update sv_imagenes set seccion = 'ingles-foto',     slot = 2 where seccion = 'ingles'      and slot = 5;
