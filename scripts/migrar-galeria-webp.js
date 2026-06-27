/**
 * Migra todas las imágenes de club_galeria a WebP optimizado.
 *
 * Pasos por imagen:
 *   1. Descarga la imagen original desde la URL pública de Supabase
 *   2. La convierte a WebP (calidad 82) con sharp
 *   3. Sube el nuevo archivo al bucket "club-sanvi" reemplazando el original
 *   4. Actualiza la columna `url` en la tabla club_galeria
 *
 * Uso: node scripts/migrar-galeria-webp.js
 * Requiere: .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = "club-sanvi";
const QUALITY = 82;

function pathFromUrl(url) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function toWebp(buffer) {
  return sharp(buffer).webp({ quality: QUALITY }).toBuffer();
}

async function main() {
  const { data: rows, error } = await supabase
    .from("club_galeria")
    .select("id, url")
    .order("orden", { ascending: true });

  if (error) { console.error("Error leyendo tabla:", error.message); process.exit(1); }
  if (!rows.length) { console.log("No hay imágenes en club_galeria."); return; }

  console.log(`Encontradas ${rows.length} imágenes. Iniciando migración...\n`);

  let ok = 0, omitidas = 0, errores = 0;

  for (const row of rows) {
    const oldPath = pathFromUrl(row.url);
    if (!oldPath) {
      console.warn(`[OMITIR] ID ${row.id}: no se pudo extraer el path de la URL.`);
      omitidas++;
      continue;
    }

    const alreadyWebp = oldPath.toLowerCase().endsWith(".webp");

    try {
      const originalBuffer = await downloadBuffer(row.url);
      const webpBuffer     = await toWebp(originalBuffer);

      const pctSaving = (((originalBuffer.length - webpBuffer.length) / originalBuffer.length) * 100).toFixed(1);

      // Construir el nuevo path con extensión .webp
      const newPath = alreadyWebp
        ? oldPath                                              // ya era webp, sobreescribir
        : oldPath.replace(/\.[^.]+$/, ".webp");               // cambiar extensión

      // Subir el nuevo archivo (upsert para sobrescribir si existe)
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, webpBuffer, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true
        });
      if (uploadErr) throw new Error("Storage upload: " + uploadErr.message);

      // Obtener la nueva URL pública
      const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
      const newUrl = pubData.publicUrl;

      // Actualizar la base de datos
      const { error: updateErr } = await supabase
        .from("club_galeria")
        .update({ url: newUrl })
        .eq("id", row.id);
      if (updateErr) throw new Error("DB update: " + updateErr.message);

      // Borrar el archivo original si cambió el path (era jpg/png/etc.)
      if (!alreadyWebp && oldPath !== newPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }

      const status = alreadyWebp ? "reoptimizado" : "convertido";
      console.log(`[OK] ID ${row.id} — ${status} (${pctSaving}% menos) → ${newPath}`);
      ok++;
    } catch (e) {
      console.error(`[ERROR] ID ${row.id}: ${e.message}`);
      errores++;
    }
  }

  console.log(`\n--- Resumen ---`);
  console.log(`OK:       ${ok}`);
  console.log(`Omitidas: ${omitidas}`);
  console.log(`Errores:  ${errores}`);
}

main();
