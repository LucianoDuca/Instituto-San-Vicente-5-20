(function (root) {
  "use strict";

  const core = root.LibretasCore;

  const BASE = "assets/libretas/";
  const IMG = {
    esquinaSup: BASE + "esquina-superior.png",
    esquinaInf: BASE + "esquina-inferior.png",
    firma: BASE + "firma.png",
    logo: "assets/img/Sanvi Logos/logo.webp",
    fondoPortada: BASE + "primaria/fondo-hoja1.png",
    poster: BASE + "primaria/fondo2-hoja1.jpg",
    logoFace: BASE + "primaria/logo-face.webp",
    logoFinal: BASE + "primaria/logo-final.jpg"
  };
  const FIRMA_SEC = { nombre: "PABLO CESAR GARRAZA", cargo: "FIRMA DIRECTIVO" };

  function esc(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function img(src, clase, extra) {
    return `<img class="${clase}" src="${esc(src)}" alt="" crossorigin="anonymous" ${extra || ""} onerror="this.classList.add('lb-sin-img')">`;
  }

  function firmaSrc(valor) {
    return /^(https?:|data:|blob:|\/)/.test(valor) ? valor : BASE + "firmas/" + valor;
  }

  /* ============ Secundaria ============ */

  function celda(texto, clase, extra) {
    return `<td${clase ? ` class="${clase}"` : ""}${extra ? " " + extra : ""}>${texto}</td>`;
  }

  function colgroupSec() {
    const anchos = [20, 52, 14, 14, 14, 16, 3, 14, 14, 14, 16, 3, 11, 11, 3, 17];
    return `<colgroup>${anchos.map((w) => `<col style="width:${w}mm">`).join("")}</colgroup>`;
  }

  function celdaEv(orig, act) {
    if (act !== null && act !== undefined) return `<span class="lb-orig">(${esc(orig)})</span> ${core.fmt(act, 2)}`;
    return esc(orig);
  }

  function hojasSecundaria(vm) {
    const f1 = (n) => core.fmt(n, 1);
    const f2 = (n) => core.fmt(n, 2);
    const sb = celda("", "sb");
    const colgroup = colgroupSec();

    const filasMat = vm.materias.map((m, i) => `<tr>
      ${i === 0 ? celda("ESPACIOS<br>CURRICULARES", "rojo", `rowspan="${vm.materias.length}"`) : ""}
      ${celda(esc(m.label), "izq rojo2")}
      ${celda(esc(m.p1))}${celda(celdaEv(m.e11, m.a11))}${celda(celdaEv(m.e12, m.a12))}${celda(f1(m.pm1))}${sb}
      ${celda(esc(m.p2))}${celda(celdaEv(m.e21, m.a21))}${celda(celdaEv(m.e22, m.a22))}${celda(f2(m.pm2))}${sb}
      ${celda(esc(m.dic), "celeste")}${celda(esc(m.feb), "celeste")}${sb}
      ${celda(f2(m.fin), "nf")}</tr>`).join("");

    const tablaMaterias = `<table class="lb-t">${colgroup}
      <tr>${sb}${sb}${celda("PRIMER CUATRIMESTRE", "tit", 'colspan="4"')}${sb}${celda("SEGUNDO CUATRIMESTRE", "tit", 'colspan="4"')}${sb}${celda("MESAS DE<br>EXAMENES", "tit", 'colspan="2"')}${sb}${celda("NOTA<br>FINAL", "hnf", 'rowspan="2"')}</tr>
      <tr>${sb}${sb}${celda("PROCON", "h-naranja")}${celda("EV1", "h-ev")}${celda("EV2", "h-ev")}${celda("PROMEDIO", "h-naranja")}${sb}${celda("PROCON", "h-naranja")}${celda("EV1", "h-ev")}${celda("EV2", "h-ev")}${celda("PROMEDIO", "h-naranja")}${sb}${celda("DIC")}${celda("FEB")}${sb}</tr>
      ${filasMat}</table>`;

    const ing = vm.ingles;
    const filasIng = ing.habilidades.map((h, i) => `<tr>
      ${i === 0 ? celda("ENGLISH", "azul", 'rowspan="6"') : ""}
      ${celda(esc(h.label), "izq azul")}
      ${celda(esc(h.p1))}${sb}${sb}${celda(esc(h.n1))}${sb}
      ${celda(esc(h.p2))}${sb}${sb}${celda(esc(h.n2))}${sb}${sb}${sb}${sb}${sb}</tr>`).join("");

    const tablaIngles = `<table class="lb-t">${colgroup}${filasIng}
      <tr>${celda("AVERAGE", "izq azul")}${sb}${sb}${sb}${celda(f2(ing.avg1), "celeste")}${sb}${sb}${sb}${sb}${celda(f2(ing.avg2), "celeste")}${sb}${celda(esc(ing.dic), "celeste")}${celda(esc(ing.feb), "celeste")}${sb}${celda(f2(ing.fin), "nf")}</tr></table>`;

    const tablaComentarios = `<table class="lb-t">${colgroup}<tr>
      ${celda("COMENTARIOS", "azul", 'style="font-size:10px"')}
      ${celda(esc(ing.com1), "texto", 'colspan="5" style="font-size:9px"')}${sb}
      ${celda(esc(ing.com2), "texto", 'colspan="9" style="font-size:9px"')}</tr></table>`;

    const filasEce = vm.electivos.map((e, i) => `<tr>
      ${i === 0 ? celda("ECE<br>ESPACIOS CURRICULARES<br>ELECTIVOS", "rojo", `rowspan="${vm.electivos.length}"`) : ""}
      ${celda(esc(e.label), "izq rojo2")}
      ${celda(esc(e.p1))}${sb}${sb}${sb}${sb}${celda(esc(e.p2))}${sb}${sb}${sb}${sb}${sb}${sb}${sb}${sb}</tr>`).join("");
    const tablaEce = vm.electivos.length ? `<table class="lb-t">${colgroup}${filasEce}</table>` : "";

    const tablaGeneral = `<table class="lb-t">${colgroup}<tr>
      ${celda("PROMEDIO ANUAL GENERAL", "izq lb-anual", 'colspan="15"')}${celda(f2(vm.promedioAnual), "nf", 'style="font-weight:700"')}</tr>
      <tr>${celda("DEVOLUCION ANUAL", "rojo", 'colspan="2" style="white-space:nowrap"')}${celda(esc(vm.devolucion), "texto", 'colspan="14" style="font-size:9px"')}</tr></table>`;

    const a = vm.asistencia;
    const tablaAsistencia = `<table class="lb-t" style="width:140mm;font-size:10px">
      <tr>${celda("", "sb", 'colspan="2"')}${celda("PRIMER CUATRIMESTRE", "claro")}${celda("SEGUNDO CUATRIMESTRE", "claro")}</tr>
      <tr>${celda("ASISTENCIA", "claro", 'rowspan="4"')}${celda("Inasistencias Justificadas", "izq")}${celda(esc(a.ij1))}${celda(esc(a.ij2))}</tr>
      <tr>${celda("Inasistencias Injustificadas", "izq")}${celda(esc(a.ii1))}${celda(esc(a.ii2))}</tr>
      <tr>${celda("Tardanzas Justificadas", "izq")}${celda(esc(a.tj1))}${celda(esc(a.tj2))}</tr>
      <tr>${celda("Tardanzas Injustificadas", "izq")}${celda(esc(a.ti1))}${celda(esc(a.ti2))}</tr>
      <tr>${celda("", "sb")}${celda("Total", "claro izq")}${celda(a.t1 === null ? "" : String(a.t1), "claro")}${celda(a.t2 === null ? "" : String(a.t2), "claro")}</tr></table>`;

    return [`<div class="lb-hoja">
      ${img(IMG.esquinaSup, "lb-esq-sup")}
      <header class="lb-cab">
        <div class="lb-cab-izq"><span>${esc(vm.anio)}</span></div>
        <div class="lb-cab-centro"><h2>INFORME ACADEMICO</h2></div>
        <div class="lb-cab-der"><h3>ESTUDIANTE: <span class="lb-nombre">${esc(vm.alumno.nombreCompleto)}</span></h3><h3>${esc(vm.curso.titulo)}</h3></div>
      </header>
      <div class="lb-cuerpo">
        ${tablaMaterias}${tablaIngles}${tablaComentarios}${tablaEce}${tablaGeneral}
        <div class="lb-pie">
          ${tablaAsistencia}
          ${img(IMG.logo, "lb-logo")}
          <div class="lb-firma">${img(IMG.firma, "lb-firma-img")}<span class="nom">${esc(FIRMA_SEC.nombre)}</span><span class="cargo">${esc(FIRMA_SEC.cargo)}</span></div>
        </div>
      </div>
      <div class="lb-ref">
        <h3>REFERENCIAS</h3>
        <span><b>PROCON:</b>CONSIDERA ASPECTOS DEL ESTUDIANTE RELACIONADOS AL COMPORTAMIENTO Y LA CONVIVENCIA Y ASPECTOS ACADÉMICOS ORIENTADOS AL TRABAJO EN CLASE.</span>
        <span><b>EV:</b>EVALUACIONES</span>
        <span><b>EV1:</b>EVALUACION 1er BIMESTRE.</span>
        <span><b>EV2:</b>EVALUACION 2do BIMESTRE.</span>
      </div>
      ${img(IMG.esquinaInf, "lb-esq-inf")}
    </div>`];
  }

  /* ============ Primaria ============ */

  const FILAS = [["t1", "1º"], ["t2", "2º"], ["t3", "3º"], ["dic", "DIC"], ["feb", "FEB"]];

  function girado(cabecera) {
    if (Array.isArray(cabecera)) {
      return `<span class="lbp-girado lbp-subir">${esc(cabecera[0])}</span><span class="lbp-girado lbp-bajar">${esc(cabecera[1])}</span>`;
    }
    return `<span class="lbp-girado">${esc(cabecera)}</span>`;
  }

  function hojasPrimaria(vm) {
    const ciclo = vm.ciclo;
    const cols = vm.materias.concat([vm.procon]);
    const n = cols.length;

    const filasNotas = FILAS.map(([k, etq], idx) => `<tr class="lbp-alto-celda${idx < 4 ? " lbp-bb" : ""}">
      <td class="lbp-neg lbp-br3">${etq}</td>
      ${cols.map((c, i) => `<td class="${i < n - 1 ? "lbp-br1" : ""}">${esc(c.v[k])}</td>`).join("")}</tr>`).join("");

    const tablaNotas = `<div class="lbp-caja lbp-espacios"><table class="lbp-t">
      <tr><td rowspan="2" class="lbp-ancho">${girado("INFORMES TRIMESTRALES")}</td><td colspan="${n}" class="lbp-titulo lbp-bi lbp-bl">ESPACIOS CURRICULARES</td></tr>
      <tr class="lbp-alto-cab lbp-bi">${cols.map((c, i) => `<td class="lbp-ancho ${i === 0 ? "lbp-bl3 " : ""}${i < n - 1 ? "lbp-br1" : ""}">${girado(c.cabecera)}</td>`).join("")}</tr>
      ${filasNotas}
      <tr class="lbp-bs3"><td class="lbp-neg lbp-br3"><p>NOTA</p><p>FINAL</p></td>${cols.map((c, i) => `<td class="${i < n - 1 ? "lbp-br1" : ""}">${esc(c.v.fin)}</td>`).join("")}</tr>
    </table></div>`;

    const ing = vm.ingles;
    const ni = ing.length + 1;
    const filasIng = FILAS.map(([k], idx) => {
      const celdas = ing.map((c) => `<td class="lbp-br1">${esc(c.v[k])}</td>`).join("");
      const avg = idx < 3 ? `<td>${esc(vm.average.v[k])}</td>` : `<td></td>`;
      return `<tr class="lbp-alto-celda${idx < 4 ? " lbp-bb" : ""}">${celdas}${avg}</tr>`;
    }).join("");
    const tablaIngles = `<div class="lbp-caja lbp-ingles"><table class="lbp-t">
      <tr><td colspan="${ni}" class="lbp-titulo lbp-bi">ENGLISH</td></tr>
      <tr class="lbp-alto-cab lbp-bi">${ing.map((c) => `<td class="lbp-ancho lbp-br1">${girado(c.cabecera)}</td>`).join("")}<td class="lbp-ancho">${girado("AVERAGE")}</td></tr>
      ${filasIng}
      <tr class="lbp-bs3 lbp-alto-celda"><td colspan="${ing.length}" class="lbp-br1"></td><td>${esc(vm.average.v.fin)}</td></tr>
    </table></div>`;

    let tablaProm = "";
    if (ciclo === 2) {
      const pt = vm.promTrimestral;
      tablaProm = `<div class="lbp-caja lbp-promtrim"><table class="lbp-t">
        <tr><td class="lbp-titulo lbp-bi lbp-chico"></td></tr>
        <tr class="lbp-alto-cab lbp-bi"><td class="lbp-ancho">${girado("PROMEDIO TRIMESTRAL")}</td></tr>
        ${FILAS.map(([k], idx) => `<tr class="lbp-alto-celda${idx < 4 ? " lbp-bb" : ""}"><td>${idx < 3 ? esc(pt[k]) : ""}</td></tr>`).join("")}
        <tr class="lbp-bs3 lbp-alto-celda"><td><strong>${esc(pt.fin)}</strong></td></tr>
      </table></div>`;
    }

    const refs = ciclo === 1
      ? `<tr><td>MUY LOGRADO<br>ML(10,9)</td></tr><tr><td>LOGRADO<br>L(8,7)</td></tr><tr><td>EN PROCESO<br>EP(6,5)</td></tr><tr><td>NECESITA REFORZAR<br>NR(4,3,2,1)</td></tr>`
      : `<tr><td>APROBADO<br>(10,9,8,7,6)</td></tr><tr><td>DESAPROBADO<br>(5,4,3,...)</td></tr>`;
    const tablaRefs = `<div class="lbp-caja lbp-refs"><table><tr><td class="lbp-titulo lbp-bi">REFERENCIAS</td></tr>${refs}</table></div>`;

    const filasAsis = vm.asistencia.map((a, i) => `<tr class="lbp-alto-asis${i < 2 ? " lbp-bb" : ""}">
      <td class="lbp-neg lbp-br3">${i + 1}º</td><td class="lbp-br1">${esc(a.h)}</td><td class="lbp-br1">${esc(a.i)}</td><td class="lbp-br1">${esc(a.r)}</td><td>${esc(a.total)}</td></tr>`).join("");
    const tablaAsis = `<div class="lbp-caja lbp-asis"><table class="lbp-t">
      <tr class="lbp-bb"><td rowspan="2" class="lbp-ancho lbp-br3">${girado("TRIMESTRES")}</td><td colspan="4" class="lbp-titulo">ASISTENCIA</td></tr>
      <tr class="lbp-alto-cab-asis lbp-bb"><td class="lbp-ancho lbp-br1">${girado("DÍAS HÁBILES")}</td><td class="lbp-ancho lbp-br1">${girado("INASISTENCIAS")}</td><td class="lbp-ancho lbp-br1">${girado("TARDANZAS")}</td><td class="lbp-ancho">${girado("TOTAL")}</td></tr>
      ${filasAsis}
    </table></div>`;

    const obs = vm.devolucion.map((t, i) => `<div class="lbp-obs${i === 2 ? " lbp-sin-borde" : ""}"><h3 class="lbp-girado-h">${i + 1}º TRIMESTRE</h3><p>${esc(t)}</p></div>`).join("");
    const devolucion = `<div class="lbp-devol"><h2 class="lbp-titulo lbp-centrar lbp-bs3 lbp-br3 lbp-bl3">DEVOLUCIÓN / COMMENTS:</h2><div class="lbp-observaciones">${obs}</div></div>`;

    const docentes = (vm.firmas.docentes || []).map((f) => img(firmaSrc(f), "lbp-firma")).join("");
    const director = (vm.firmas.director || []).map((f) => img(firmaSrc(f), "lbp-firma lbp-firma-dire")).join("");
    const filasFirmas = [0, 1, 2].map((i) => {
      const ver = vm.final.firmas[i];
      return `<tr><td class="lbp-alto-trim">${i + 1}º</td><td>${ver ? docentes : ""}</td><td>${ver ? director : ""}</td></tr>`;
    }).join("");
    const f = vm.final;

    const portada = `<div class="lbp-hoja lbp-portada">
      <div class="lbp-fondo">${img(IMG.fondoPortada, "lbp-fondo-img")}</div>
      ${img(IMG.poster, "lbp-poster")}
      <div class="lbp-info-alumno">
        ${img(IMG.logo, "lbp-logo-portada")}
        <h2>LIBRETA INFORMATIVA</h2>
        <h3>INSTITUTO <span>SAN VICENTE</span></h3>
        <p>Juana Koslay - San Luis</p>
        <div class="lbp-datos">
          <div class="lbp-entrada"><span class="lbp-label">ESTUDIANTE:</span><span class="lbp-box"><span>${esc(vm.alumno.nombreCompleto)}</span></span></div>
          <div class="lbp-entrada"><span class="lbp-label">DNI:</span><span class="lbp-box"><span>${esc(vm.alumno.dni)}</span></span></div>
          <div class="lbp-entrada"><span class="lbp-label">GRADO:</span><span class="lbp-box"><span>${esc(vm.curso.titulo)}</span></span></div>
          <div class="lbp-entrada"><span class="lbp-label">DOCENTES:</span><span class="lbp-box"><span>${esc(vm.docentes)}</span></span></div>
          <div class="lbp-entrada"><span class="lbp-label">AÑO:</span><span class="lbp-box"><span>${esc(vm.anio)}</span></span></div>
        </div>
        <div class="lbp-pie-portada">
          <p class="lbp-frase">¿QUÉ QUERÉS SER CUANDO TE LO PROPONGAS?</p>
          <div class="lbp-pie-cols">
            <div><span>Gobierno de San Luis</span><span><b>Incorporado a la Enseñanza Oficial</b></span><span><b>CUE: 740068400</b></span></div>
            <div style="text-align:right"><span>${img(IMG.logoFace, "lbp-face")}institutosanvicente</span><span>www.institutosanvicente.com</span><span>info@institutosanvicente.com</span></div>
          </div>
        </div>
      </div>
    </div>`;

    const pagina2 = `<div class="lbp-hoja">
      <div class="lbp-fila">${tablaNotas}${tablaIngles}${tablaProm}${tablaRefs}</div>
      <div class="lbp-fila">${tablaAsis}${devolucion}</div>
    </div>`;

    const pagina3 = `<div class="lbp-hoja">
      <table class="lbp-finales">
        <tr><td class="lbp-c1 lbp-enc">TRIMESTRE</td><td class="lbp-c2 lbp-enc">FIRMA DOCENTE/S</td><td class="lbp-c3 lbp-enc">FIRMA DIRECTOR/A</td><td rowspan="9" class="lbp-c4 lbp-sup">${img(IMG.logoFinal, "lbp-cert")}</td></tr>
        ${filasFirmas}
        <tr><td colspan="3" class="lbp-rallado"></td></tr>
        <tr><td colspan="2" class="lbp-izq">PROMEDIO FINAL:</td><td>${esc(f.promedio)}</td></tr>
        <tr><td colspan="2" class="lbp-izq">PROMOVIDO A:</td><td>${esc(f.promovido)}</td></tr>
        <tr><td colspan="2" class="lbp-izq">PROMOVIDO C/ ACOMPAÑAMIENTO A:</td><td>${esc(f.acomp)}</td></tr>
        <tr><td colspan="2" class="lbp-izq">PERMANECE EN:</td><td>${esc(f.permanece)}</td></tr>
      </table>
      <table class="lbp-finales lbp-firmas-finales">
        <tr><td class="lbp-f1">CERTIFICACIÓN FINAL</td><td class="lbp-f2">DOCENTE</td><td class="lbp-f2">DIRECTOR/A</td></tr>
        <tr><td>${img(IMG.logo, "lbp-logo-final")}</td><td class="lbp-centro-firmas">${docentes}</td><td class="lbp-centro-firmas">${director}</td></tr>
      </table>
    </div>`;

    return [portada, pagina2, pagina3];
  }

  /* ============ Inicial ============ */

  const COLORES_AREA = { lengua: "#d93025", matematica: "#1a56a8", sociales: "#e37400", naturales: "#2e9e5b", plastica: "#8e44ad", musica: "#d81b60", ingles: "#0b8fbf", fisica: "#00897b", actitudinal: "#5d4037" };
  const LEYENDA = [["ML", "MUY LOGRADO"], ["L", "LOGRADO"], ["EP", "EN PROCESO"], ["NR", "NECESITA REFORZAR"]];
  const LEYENDA_PROCON = [["S", "SIEMPRE"], ["F", "FRECUENTEMENTE"], ["AV", "A VECES"], ["AN", "AÚN NO"]];

  function tablaArea(area) {
    const color = COLORES_AREA[area.id] || "#1a56a8";
    const filas = area.bloques.map((b) => {
      const titulo = b.titulo ? `<tr class="lbi-blq"><td colspan="3" style="color:${color}">${esc(b.titulo)}</td></tr>` : "";
      const rows = b.filas.map((f) => {
        if (f.subs) {
          return f.subs.map((sub, i) => `<tr>${i === 0 ? `<td class="lbi-desc" rowspan="${f.subs.length}">${esc(f.label)}</td>` : ""}<td class="lbi-sub">${esc(sub.label)}</td><td class="lbi-nota">${esc(sub.e1)}</td><td class="lbi-nota">${esc(sub.e2)}</td></tr>`).join("");
        }
        return `<tr><td class="lbi-desc" colspan="2">${esc(f.label)}</td><td class="lbi-nota">${esc(f.valores.e1)}</td><td class="lbi-nota">${esc(f.valores.e2)}</td></tr>`;
      }).join("");
      return titulo + rows;
    }).join("");
    return `<div class="lbi-area">
      <div class="lbi-area-tit" style="background:${color}">${esc(area.label.toUpperCase())}</div>
      <table class="lbi-t"><tr class="lbi-cab" style="color:${color}"><td colspan="2"></td><td>1ª<br>ETAPA</td><td>2ª<br>ETAPA</td></tr>${filas}</table>
    </div>`;
  }

  function hojasInicial(vm) {
    const seccion = vm.curso.seccion;
    const portada = `<div class="lbi-hoja lbi-portada">
      <div class="lbi-banda-sup"></div>
      <div class="lbi-portada-cuerpo">
        ${img(IMG.logo, "lbi-logo-grande")}
        <h1>LIBRETA INFORMATIVA</h1>
        <h2>INSTITUTO <span>SAN VICENTE</span></h2>
        <p class="lbi-loc">Juana Koslay - San Luis</p>
        <p class="lbi-nivel">NIVEL INICIAL</p>
        <div class="lbi-datos">
          <div class="lbi-dato"><span>ESTUDIANTE:</span><b>${esc(vm.alumno.nombreCompleto)}</b></div>
          <div class="lbi-dato"><span>DNI:</span><b>${esc(vm.alumno.dni)}</b></div>
          <div class="lbi-dato"><span>SALA:</span><b>${esc(vm.sala)}</b><span class="lbi-sep">SECCIÓN:</span><b>${esc(seccion)}</b><span class="lbi-sep">AÑO:</span><b>${esc(vm.anio)}</b></div>
        </div>
        <p class="lbi-frase">¿QUÉ QUERÉS SER CUANDO TE LO PROPONGAS?</p>
      </div>
      <div class="lbi-pie-portada">
        <div><span>Gobierno de San Luis</span><span><b>Incorporado a la Enseñanza Oficial</b></span><span><b>CUE: 740068400</b></span></div>
        <div style="text-align:right"><span>institutosanvicente</span><span>www.institutosanvicente.com</span><span>info@institutosanvicente.com</span></div>
      </div>
    </div>`;

    if (vm.sala < 4) {
      const pagina = (titulo, textoInforme) => `<div class="lbi-hoja lbi-libre">
        <div class="lbi-banda-sup lbi-fina"></div>
        <h2 class="lbi-titulo-hoja">${esc(titulo)} · ${esc(vm.alumno.nombreCompleto)} · Sala ${esc(vm.sala)}º${esc(seccion)} · ${esc(vm.anio)}</h2>
        <div class="lbi-informe">${esc(textoInforme)}</div>
      </div>`;
      return [portada, pagina("Informe 1ª etapa", vm.texto1), pagina("Informe 2ª etapa", vm.texto2)];
    }

    const fir = (lista, cls) => (lista || []).map((f) => img(firmaSrc(f), cls || "lbi-firma")).join("");
    const legendas = `<div class="lbi-caja"><div class="lbi-caja-tit">CÓDIGO DE REFERENCIAS</div>
      <div class="lbi-refs"><table>${LEYENDA.map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table>
      <table>${LEYENDA_PROCON.map(([a, b]) => `<tr><td><b>${a}</b></td><td>${b}</td></tr>`).join("")}</table></div>
      <div class="lbi-refs-sub"><span>REFERENCIAS</span><span>REFERENCIAS PROCON</span></div></div>`;
    const firmas = `<div class="lbi-caja"><div class="lbi-caja-tit">FIRMAS</div>
      <table class="lbi-t lbi-firmas"><tr class="lbi-cab"><td></td><td>1ª ETAPA</td><td>2ª ETAPA</td></tr>
      <tr><td class="lbi-desc">DOCENTE</td><td>${esc(vm.config.docentes1)}<div>${fir(vm.config.firmas1)}</div></td><td>${esc(vm.config.docentes2)}<div>${fir(vm.config.firmas2)}</div></td></tr>
      <tr><td class="lbi-desc">DIRECTOR/A</td><td>${fir(vm.config.firmasDirector)}</td><td>${fir(vm.config.firmasDirector)}</td></tr></table></div>`;
    const asis = `<div class="lbi-caja"><div class="lbi-caja-tit">ASISTENCIAS</div>
      <table class="lbi-t lbi-asis"><tr class="lbi-cab"><td></td><td>TOTAL DÍAS HÁBILES</td><td>TOTAL ASISTENCIAS</td><td>TOTAL INASISTENCIAS</td></tr>
      ${vm.asistencia.map((a, i) => `<tr><td class="lbi-desc">${i + 1}ª ETAPA</td><td>${esc(a.h)}</td><td>${esc(a.a)}</td><td>${esc(a.i)}</td></tr>`).join("")}
      <tr class="lbi-total"><td class="lbi-desc">TOTAL ANUAL</td><td>${esc(vm.total.h)}</td><td>${esc(vm.total.a)}</td><td>${esc(vm.total.i)}</td></tr></table></div>`;
    const pagina2 = `<div class="lbi-hoja"><div class="lbi-banda-sup lbi-fina"></div><div class="lbi-grid2">${legendas}${firmas}</div>${asis}</div>`;

    const o = vm.observaciones;
    const foto = (u) => (u ? img(u, "lbi-foto") : "");
    const caja = (t, txt, url) => `<div class="lbi-caja"><div class="lbi-caja-tit">${esc(t)} · ASÍ SOY YO</div><div class="lbi-foto-caja">${foto(url)}</div><div class="lbi-obs-texto">${esc(txt)}</div></div>`;
    const pagina3 = `<div class="lbi-hoja"><div class="lbi-banda-sup lbi-fina"></div><div class="lbi-grid3">${caja("PERIODO DIAGNÓSTICO - INICIO", o.diag, vm.fotos.diag)}${caja("1ª ETAPA", o.o1, vm.fotos.e1)}${caja("2ª ETAPA", o.o2, vm.fotos.e2)}</div></div>`;

    const porId = Object.fromEntries(vm.areas.map((a) => [a.id, a]));
    const paginasAreas = vm.paginas.map((ids) => `<div class="lbi-hoja"><div class="lbi-banda-sup lbi-fina"></div><div class="lbi-grid2 lbi-areas">${ids.map((id) => tablaArea(porId[id])).join("")}</div></div>`);

    return [portada, pagina2, pagina3].concat(paginasAreas);
  }

  /* ============ Punto de entrada ============ */

  function htmlHojas(vm) {
    if (!vm) return [];
    if (vm.tipo === "secundaria") return hojasSecundaria(vm);
    if (vm.tipo === "primaria") return hojasPrimaria(vm);
    if (vm.tipo === "inicial") return hojasInicial(vm);
    return [];
  }

  root.LibretasHojas = { htmlHojas, esc, img, IMG, firmaSrc };
})(typeof self !== "undefined" ? self : this);
