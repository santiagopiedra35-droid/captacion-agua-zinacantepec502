/* calculadora.js — Versión optimizada
   - Debounce en cálculos
   - Menos listeners (delegación donde aplica)
   - Manejo de errores
   - Estados de carga (spinner + disabling)
   - Guarda/recupera resultado en localStorage (clave: resultadoAgua2025)
*/

(() => {
  'use strict';

  const STORAGE_KEY = 'resultadoAgua2025';
  const EQUIV = { tinaco: 1100, ducha: 60, lavadora: 50 };
  const CO2_PER_LITER_KG = 0.00027;
  const coeficientes = { metal: 0.95, teja: 0.85, concreto: 0.80, lamina: 0.90, otros: 0.70 };

  // Cache DOM (una sola búsqueda por elemento)
  const form = document.getElementById('formularioCaptacion');
  const salidaEl = document.getElementById('salida');
  const resetBtn = document.getElementById('btnReset');
  const barsContainer = document.getElementById('barsContainer');
  const shareControls = document.getElementById('shareControls');
  const shareWs = document.getElementById('share-ws');
  const shareFb = document.getElementById('share-fb');
  const shareTw = document.getElementById('share-tw');
  const shareCopy = document.getElementById('share-copy');
  const shareFeedback = document.getElementById('share-feedback');

  const barTinacos = document.getElementById('bar-tinacos');
  const barTinacosVal = document.getElementById('bar-tinacos-val');
  const barDuchas = document.getElementById('bar-duchas');
  const barDuchasVal = document.getElementById('bar-duchas-val');
  const barLavados = document.getElementById('bar-lavados');
  const barLavadosVal = document.getElementById('bar-lavados-val');

  const submitBtn = form && form.querySelector('button[type="submit"]');

  // UTILIDADES
  const fmt = (n, digits = 0) => (typeof n === 'number' && isFinite(n)) ? n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '-';

  const safeJSONparse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

  const saveLocal = (key, obj) => {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { console.warn('localStorage set failed', e); }
  };
  const loadLocal = (key) => {
    try { return safeJSONparse(localStorage.getItem(key)); } catch (e) { return null; }
  };

  // Debounce helper (returns debounced fn)
  function debounce(fn, wait = 250) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Loading UI: create spinner overlay in #resultado if not exists
  function ensureLoader() {
    const resultSection = document.getElementById('resultado');
    if (!resultSection) return null;
    let loader = resultSection.querySelector('.calc-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'calc-loader loading-overlay hidden';
      loader.innerHTML = '<div class="loader" role="status" aria-live="polite" aria-label="Cargando"></div>';
      // position relative must exist on resultSection or parent; we assume CSS allows absolute overlay
      resultSection.style.position = resultSection.style.position || 'relative';
      resultSection.appendChild(loader);
    }
    return loader;
  }

  function setLoading(on, message = 'Calculando...') {
    const loader = ensureLoader();
    if (loader) {
      loader.classList.toggle('hidden', !on);
    }
    if (submitBtn) {
      submitBtn.disabled = Boolean(on);
      if (on) submitBtn.setAttribute('aria-busy', 'true');
      else submitBtn.removeAttribute('aria-busy');
    }
    // show simple status text while loading
    if (on) {
      salidaEl.innerHTML = `<p>${message}</p>`;
      const resultSection = document.getElementById('resultado');
      if (resultSection) resultSection.setAttribute('aria-busy', 'true');
    } else {
      const resultSection = document.getElementById('resultado');
      if (resultSection) resultSection.removeAttribute('aria-busy');
    }
  }

  // Validaciones
  const isPositive = (n) => typeof n === 'number' && isFinite(n) && n > 0;

  // Construcción texto para compartir (centralizado)
  function construirTextoCompartir(obj) {
    const contactoFB = 'https://www.facebook.com/Santg.sp';
    const contactoWA = '+52 1 722 146 5696';
    let texto = `Estimo captar ${fmt(obj.volumen_l,0)} L/año (${fmt(obj.volumen_m3,3)} m³/año). `;
    if (obj.mostrarROI && obj.roi_meses !== null) texto += `Recuperaré la inversión en ${fmt(obj.roi_meses,1)} meses. `;
    texto += `Equivale a ${Math.floor(obj.volumen_l / (obj.capacidadTinaco || EQUIV.tinaco))} tinacos. ¡Estoy ayudando al planeta! `;
    texto += `Contacto: Facebook ${contactoFB} · WhatsApp ${contactoWA}`;
    return texto;
  }

  // Compartir (funciones pequeñas)
  const shareWhatsApp = (t) => window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank');
 
  const shareFacebook = (t) => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}&quote=${encodeURIComponent(t)}`, '_blank');
  const copyText = async (t) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(t);
      } else {
        const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      shareFeedback.textContent = 'Resultado copiado al portapapeles.';
      setTimeout(() => { shareFeedback.textContent = ''; }, 3000);
    } catch (e) {
      shareFeedback.textContent = 'No se pudo copiar. Usa Ctrl+C/Cmd+C.';
      setTimeout(() => { shareFeedback.textContent = ''; }, 3000);
    }
  };

  // Actualizar barras (visual)
  function actualizarBarras(volumen_l, capacidadTinaco, tinacosFullFloor, duchas, lavados) {
    if (!barsContainer) return;
    barsContainer.style.display = 'block';
    barsContainer.setAttribute('aria-hidden','false');

    const maxTinacos = 10, maxDuchas = 100, maxLavados = 200;
    const tinacosCount = (capacidadTinaco > 0) ? (volumen_l / capacidadTinaco) : 0;
    const pctTinacos = Math.min(100, (tinacosCount / maxTinacos) * 100);
    if (barTinacos) { barTinacos.style.width = pctTinacos + '%'; barTinacosVal.textContent = `${Math.floor(tinacosCount)} / ${maxTinacos}`; }

    const pctDuchas = Math.min(100, (duchas / maxDuchas) * 100);
    if (barDuchas) { barDuchas.style.width = pctDuchas + '%'; barDuchasVal.textContent = `${duchas} / ${maxDuchas}`; }

    const pctLavados = Math.min(100, (lavados / maxLavados) * 100);
    if (barLavados) { barLavados.style.width = pctLavados + '%'; barLavadosVal.textContent = `${lavados} / ${maxLavados}`; }
  }

  // Mostrar resultado en DOM y activar controls
  function mostrarResultado(obj) {
    try {
      const tinacosFullFloor = Math.floor(obj.volumen_l / (obj.capacidadTinaco || EQUIV.tinaco));
      const duchas = Math.floor(obj.volumen_l / EQUIV.ducha);
      const lavados = Math.floor(obj.volumen_l / EQUIV.lavadora);

      const rows = [];
      rows.push(`<div class="result-row"><strong>Volumen estimado:</strong> ${fmt(obj.volumen_m3,3)} m³/año (${fmt(obj.volumen_l,0)} L/año).<div class="muted small">Volumen anual según A × P × C.</div></div>`);
      rows.push(`<div class="result-row"><strong>Ahorro económico anual:</strong> ${obj.tieneAhorro ? fmt(obj.ahorro_anual,2) : 'No proporcionado'}</div>`);
      rows.push(`<div class="result-row"><strong>ROI:</strong> ${obj.mostrarROI ? `Recuperarás tu inversión en ${fmt(obj.roi_meses,1)} meses.` : 'Faltan datos de costo o ahorro para calcular ROI.'}</div>`);
      rows.push(`<div class="result-row"><strong>Equivalencias:</strong> ${tinacosFullFloor} tinacos llenos · ${duchas} duchas · ${lavados} lavados.</div>`);
      rows.push(`<div class="result-row"><strong>CO₂ evitado (estimado):</strong> ${fmt(obj.co2_kg,2)} kg (referencial).</div>`);
      rows.push(`<div class="result-row"><strong>Mensaje:</strong> ¡Buen trabajo! Con esto reduces consumo y ayudas al planeta.</div>`);

      salidaEl.innerHTML = `<div class="salida-inner">${rows.join('')}</div>`;
      actualizarBarras(obj.volumen_l, obj.capacidadTinaco || EQUIV.tinaco, tinacosFullFloor, duchas, lavados);

      // share setup
      if (shareControls) {
        shareControls.style.display = 'block';
        shareControls.setAttribute('aria-hidden','false');
        const textoCompartir = construirTextoCompartir(obj);
        shareWs.onclick = () => shareWhatsApp(textoCompartir);
        shareTw.onclick = () => shareTwitter(textoCompartir);
        shareFb.onclick = () => shareFacebook(textoCompartir);
        shareCopy.onclick = () => copyText(textoCompartir);
      }

      // save with extra info
      const respaldo = Object.assign({}, obj, {
        savedAt: new Date().toISOString(),
        capacidadTinaco: obj.capacidadTinaco || EQUIV.tinaco,
        tinacos_full_floor: tinacosFullFloor,
        duchas, lavados
      });
      saveLocal(STORAGE_KEY, respaldo);
    } catch (e) {
      console.error('mostrarResultado error', e);
      salidaEl.innerHTML = `<div class="result-row"><strong style="color:#b00020">Error mostrando resultado.</strong></div>`;
    } finally {
      setLoading(false);
    }
  }

  // Lógica de cálculo principal (sin IO). Retorna resultado o lanza.
  function calcular(datos) {
    if (!isPositive(datos.area)) throw new Error('Área inválida');
    if (!(datos.material)) throw new Error('Material requerido');

    const coef = coeficientes[datos.material] ?? 0.75;
    const volumen_m3 = datos.area * (datos.precipitacion / 1000) * coef;
    const volumen_l = volumen_m3 * 1000;

    const tieneAhorro = isPositive(datos.ahorroMensual);
    const ahorro_anual = tieneAhorro ? datos.ahorroMensual * 12 : null;

    let mostrarROI = false, roi_meses = null;
    if (isPositive(datos.costoSistema) && tieneAhorro) {
      mostrarROI = true;
      roi_meses = Math.round((datos.costoSistema / datos.ahorroMensual) * 10) / 10;
    }

    return {
      area: datos.area,
      material: datos.material,
      precipitacion: datos.precipitacion,
      coef,
      volumen_m3,
      volumen_l,
      tieneAhorro,
      ahorro_mensual: datos.ahorroMensual || null,
      ahorro_anual,
      costoSistema: datos.costoSistema || null,
      mostrarROI,
      roi_meses,
      co2_kg: volumen_l * CO2_PER_LITER_KG,
      capacidadTinaco: datos.capacidadTinaco || EQUIV.tinaco
    };
  }

  // Handler que envuelve cálculo con loading + debounce friendly
  async function handleCalculate(datos) {
    setLoading(true, 'Calculando...');
    try {
      // Simular trabajo ligero asincrónico para permitir UI updates (y spinner visible)
      await new Promise((res) => setTimeout(res, 220));
      const resultado = calcular(datos);
      mostrarResultado(resultado);
    } catch (e) {
      console.warn('Cálculo falló:', e);
      salidaEl.innerHTML = `<div class="result-row"><strong style="color:#b00020">Error:</strong> ${e.message || 'Datos inválidos.'}</div>`;
      setLoading(false);
    }
  }

  // Debounced auto-calc on inputs (no envia automáticamente, sólo si todos campos mínimos están presentes)
  const debouncedAutoCalc = debounce(() => {
    try {
      const area = parseFloat(document.getElementById('areaTecho').value);
      const precipitacion = parseFloat(document.getElementById('precipitacion').value);
      const material = document.getElementById('materialTecho').value;
      if (isPositive(area) && (isPositive(precipitacion) || precipitacion === 0) && material) {
        // prepare data reading optional fields too
        const capacidadTinaco = (() => { const v = document.getElementById('capacidadTinaco').value; return v ? parseFloat(v) : EQUIV.tinaco; })();
        const costoSistema = (() => { const v = document.getElementById('costoSistema').value; return v ? parseFloat(v) : null; })();
        const ahorroMensual = (() => { const v = document.getElementById('ahorroMensual').value; return v ? parseFloat(v) : null; })();
        handleCalculate({ area, precipitacion, material, capacidadTinaco, costoSistema, ahorroMensual });
      }
    } catch (err) { /* no-op: input not ready */ }
  }, 500);

  // Single event listener for relevant input events (delegated)
  if (form) {
    form.addEventListener('input', (e) => {
      const target = e.target;
      // Only react to specific inputs to avoid unnecessary work
      if (!target) return;
      const watchIds = ['areaTecho','precipitacion','materialTecho','capacidadTinaco','costoSistema','ahorroMensual'];
      if (watchIds.includes(target.id)) debouncedAutoCalc();
    });
  }

  // Submit handler (explicit calc)
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      try {
        const area = parseFloat(document.getElementById('areaTecho').value);
        const material = document.getElementById('materialTecho').value;
        const precipitacion = parseFloat(document.getElementById('precipitacion').value);
        const capacidadTinaco = (() => { const v = document.getElementById('capacidadTinaco').value; return v ? parseFloat(v) : EQUIV.tinaco; })();
        const costoSistema = (() => { const v = document.getElementById('costoSistema').value; return v ? parseFloat(v) : null; })();
        const ahorroMensual = (() => { const v = document.getElementById('ahorroMensual').value; return v ? parseFloat(v) : null; })();

        if (!isPositive(area)) { document.getElementById('areaTecho').focus(); return showError('Introduce un área válida (> 0).'); }
        if (!material) { document.getElementById('materialTecho').focus(); return showError('Selecciona el material del techo.'); }
        if (!isPositive(precipitacion) && precipitacion !== 0) { document.getElementById('precipitacion').focus(); return showError('Introduce una precipitación válida (0 o más).'); }
        if (costoSistema !== null && costoSistema < 0) return showError('El costo no puede ser negativo.');
        if (ahorroMensual !== null && ahorroMensual < 0) return showError('El ahorro mensual no puede ser negativo.');

        handleCalculate({ area, material, precipitacion, capacidadTinaco, costoSistema, ahorroMensual });
      } catch (e) {
        console.error('submit handler err', e);
        showError('Ocurrió un error inesperado. Revisa los datos e intenta de nuevo.');
      }
    });
  }

  // Reset: limpiar localStorage y UI
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
      salidaEl.innerHTML = '<p>Aún no se ha realizado el cálculo.</p>';
      if (barsContainer) barsContainer.style.display = 'none';
      if (shareControls) shareControls.style.display = 'none';
    });
  }

  // Small error UI helper
  function showError(msg) {
    salidaEl.innerHTML = `<div class="result-row"><strong style="color:#b00020">Error:</strong> ${msg}</div>`;
    setLoading(false);
  }

  // On load: restore saved result (if any)
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const guardado = loadLocal(STORAGE_KEY);
      if (guardado) {
        // repoblar inputs si vienen
        if (guardado.area) document.getElementById('areaTecho').value = guardado.area;
        if (guardado.precipitacion) document.getElementById('precipitacion').value = guardado.precipitacion;
        if (guardado.material) document.getElementById('materialTecho').value = guardado.material;
        if (guardado.costoSistema) document.getElementById('costoSistema').value = guardado.costoSistema;
        if (guardado.ahorro_mensual) document.getElementById('ahorroMensual').value = guardado.ahorro_mensual;
        if (guardado.capacidadTinaco) document.getElementById('capacidadTinaco').value = guardado.capacidadTinaco;
        // mostrar resultado guardado
        mostrarResultado(guardado);
      } else {
        // initial state
        salidaEl.innerHTML = '<p>Aún no se ha realizado el cálculo.</p>';
      }
    } catch (e) {
      console.warn('Error al cargar guardado', e);
    }
  });

  // Expose a tiny public API for debugging (optional)
  window._calcUtils = { calcular, handleCalculate, cargarGuardado: () => loadLocal(STORAGE_KEY) };

})();




