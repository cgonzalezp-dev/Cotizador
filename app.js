/* Cotizador · JR Multiservicios
   Todo corre en el navegador: nada se envía a ningún servidor. */
(function () {
  "use strict";

  var CFG = window.JR_CONFIG;
  var LS_HISTORY = "jr_cotizaciones_v1";
  var DOC_W = 794;

  /* ---------- utilidades ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var money = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  function cop(n) { return "$ " + money.format(Math.round(n || 0)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n, l) { n = String(n); while (n.length < l) n = "0" + n; return n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1, 2) + "-" + pad(d.getDate(), 2);
  }
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function fechaLarga(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    if (p.length !== 3) return iso;
    return parseInt(p[2], 10) + " de " + MESES[parseInt(p[1], 10) - 1] + " de " + p[0];
  }
  function toNumber(str) { return parseInt(String(str || "").replace(/[^\d]/g, ""), 10) || 0; }
  function fmtInput(el) {
    var n = toNumber(el.value);
    el.value = n ? "$ " + money.format(n) : "";
  }
  function gross(neto, ret) {
    ret = Math.min(Math.max(Number(ret) || 0, 0), 90);
    return ret ? Math.ceil(neto / (1 - ret / 100)) : neto;
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function lsGet(k, def) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var toastTimer;
  function toast(msg, err) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (err ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = "toast"; }, 3600);
  }

  /* ---------- estado ---------- */
  function blankState() {
    return {
      cliente: "", nit: "", fecha: todayISO(), inicio: "", duracion: "",
      validez: CFG.validezPorDefecto, logoPos: "left", retencion: 0,
      actividades: [{ id: uid(), desc: "", neto: 0 }],
      anticipoOn: false, anticipo: 0, motivo: ""
    };
  }
  var state = blankState();
  var editing = null;      // { id, numero } cuando se reabre una del historial

  var serverNext = null;   // número que la base asignará al próximo documento
  function currentNumber() { return editing ? editing.numero : (serverNext || "COT-····"); }
  function numberLabel() { return editing ? editing.numero : (serverNext || "Se asigna al generar"); }
  function refreshNext() {
    if (!window.JRRegistro) return;
    window.JRRegistro.siguiente("cotizacion").then(function (n) { serverNext = n; renderPreview(); });
  }

  function totals(s) {
    var total = 0;
    s.actividades.forEach(function (a) { total += gross(a.neto, s.retencion); });
    return { total: total };
  }

  /* ---------- documento (HTML) ---------- */
  function docHTML(s, numero) {
    var t = totals(s);
    var rows = s.actividades.filter(function (a) { return a.desc.trim() || a.neto; });
    var body = rows.length
      ? rows.map(function (a) {
          return '<tr><td class="concept">' + esc(a.desc.trim() || "Actividad") + "</td><td>" + cop(gross(a.neto, s.retencion)) + "</td></tr>";
        }).join("")
      : '<tr class="empty"><td>Aún no has agregado actividades</td><td>$ 0</td></tr>';

    var info = function (label, val, ph, full) {
      return '<div' + (full ? ' class="full"' : "") + "><dt>" + label + "</dt><dd" + (val ? "" : ' class="muted"') + ">" + (val ? esc(val) : ph) + "</dd></div>";
    };

    var anticipo = "";
    if (s.anticipoOn && s.anticipo > 0) {
      anticipo =
        '<div class="doc-anticipo"><div class="a-l"><b>Anticipo requerido</b>' +
        (s.motivo ? "<div>" + esc(s.motivo) + "</div>" : "") +
        '</div><div class="a-r">' + cop(s.anticipo) +
        "<small>Saldo: " + cop(Math.max(t.total - s.anticipo, 0)) + "</small></div></div>";
    }

    var contacto = "<b>" + esc(CFG.telefono) + "</b><br>WhatsApp " + esc(CFG.telefono) +
      (CFG.correo ? "<br>" + esc(CFG.correo) : "") + "<br>" + esc(CFG.ciudad);

    return (
      '<div class="doc">' +
      '<div class="doc-accent"></div>' +
      '<div class="doc-body">' +
      '<div class="doc-top ' + (s.logoPos === "right" ? "logo-right" : "") + '">' +
      '<div class="doc-brand"><img src="assets/icono.png" alt=""><div class="b-text"><span class="b-name">' + esc(CFG.empresa) +
      '</span><span class="b-slogan">' + esc(CFG.slogan) + '</span><span class="b-serv">' + esc(CFG.servicios) + "</span></div></div>" +
      '<div class="doc-meta"><div class="doc-title">Cotización</div><div class="m-num">N.° ' + esc(numero) +
      '</div><div class="m-date">Fecha: ' + esc(fechaLarga(s.fecha) || "—") + "</div></div>" +
      "</div>" +
      '<div class="doc-rule"></div>' +
      '<dl class="doc-info" style="margin:0">' +
      info("Cliente", s.cliente.trim(), "Sin diligenciar", true) +
      info("NIT / Cédula", s.nit.trim(), "No aplica") +
      info("Validez", s.validez.trim(), "No especificada") +
      info("Fecha de inicio", s.inicio ? fechaLarga(s.inicio) : "", "Por definir") +
      info("Duración estimada", s.duracion.trim(), "Por definir") +
      "</dl>" +
      '<table class="doc-table"><thead><tr><th>Concepto</th><th>Valor</th></tr></thead><tbody>' + body + "</tbody></table>" +
      '<div class="doc-total"><span>Total</span><strong>' + cop(t.total) + "</strong></div>" +
      anticipo +
      "</div>" +
      '<div class="doc-foot"><div class="f-phrase">Protegemos tu hogar y tu negocio con <span>tecnología profesional</span>.' +
      '<span class="f-sub">' + esc(CFG.garantias) + '</span></div><div class="f-contact">' + contacto + "</div></div>" +
      "</div>"
    );
  }

  /* ---------- vista previa ---------- */
  function fitPreview() {
    var wrap = $("paperWrap"), scaleEl = $("paperScale");
    var avail = wrap.clientWidth - 20;
    var k = Math.min(1, avail / DOC_W);
    scaleEl.style.transform = "scale(" + k + ")";
    wrap.style.height = Math.ceil(scaleEl.offsetHeight * k + 20) + "px";
  }
  function renderPreview() {
    $("numero").value = numberLabel();
    $("paperScale").innerHTML = docHTML(state, currentNumber());
    fitPreview();
  }

  /* ---------- actividades (formulario) ---------- */
  function renderActs() {
    var box = $("acts");
    box.innerHTML = "";
    state.actividades.forEach(function (a, i) {
      var el = document.createElement("div");
      el.className = "act";
      el.innerHTML =
        '<div class="act-head"><span>Actividad ' + (i + 1) + "</span>" +
        (state.actividades.length > 1 ? '<button type="button" class="act-del" data-del="' + a.id + '">Quitar</button>' : "") + "</div>" +
        '<div class="field"><label>¿Qué trabajo vas a hacer?</label><textarea data-desc="' + a.id + '" placeholder="Ej. Instalación de 4 cámaras CCTV con DVR y cableado">' + esc(a.desc) + "</textarea></div>" +
        '<div class="field"><label>Cuánto quieres ganar (neto, COP)</label>' +
        '<input type="text" inputmode="numeric" autocomplete="off" data-neto="' + a.id + '" placeholder="$ 0" value="' + (a.neto ? "$ " + money.format(a.neto) : "") + '">' +
        '<p class="calc" data-calc="' + a.id + '"></p></div>';
      box.appendChild(el);
    });
    state.actividades.forEach(updateCalc);
  }
  function updateCalc(a) {
    var p = document.querySelector('[data-calc="' + a.id + '"]');
    if (!p) return;
    p.innerHTML = "Valor que va a aparecer en la cotización: <b>" + cop(gross(a.neto, state.retencion)) + "</b>";
  }
  function findAct(id) { return state.actividades.filter(function (a) { return a.id === id; })[0]; }

  /* ---------- eventos del formulario ---------- */
  function bindSimple(id, key) {
    $(id).addEventListener("input", function () { state[key] = this.value; renderPreview(); });
  }
  function bindForm() {
    bindSimple("cliente", "cliente"); bindSimple("nit", "nit"); bindSimple("fecha", "fecha");
    bindSimple("inicio", "inicio"); bindSimple("duracion", "duracion"); bindSimple("validez", "validez");
    bindSimple("motivo", "motivo");

    document.querySelectorAll(".seg-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        state.logoPos = b.dataset.logo; syncControls(); renderPreview();
      });
    });

    function setRet(v) {
      state.retencion = Math.min(Math.max(Number(v) || 0, 0), 50);
      syncControls();
      state.actividades.forEach(updateCalc);
      renderPreview();
    }
    document.querySelectorAll("#retChips .chip").forEach(function (c) {
      c.addEventListener("click", function () { setRet(c.dataset.ret); });
    });
    $("retencion").addEventListener("input", function () {
      state.retencion = Math.min(Math.max(Number(this.value) || 0, 0), 50);
      document.querySelectorAll("#retChips .chip").forEach(function (c) {
        c.classList.toggle("is-on", Number(c.dataset.ret) === state.retencion);
      });
      state.actividades.forEach(updateCalc);
      renderPreview();
    });

    $("acts").addEventListener("input", function (e) {
      var t = e.target, id;
      if ((id = t.dataset.desc)) { findAct(id).desc = t.value; renderPreview(); }
      else if ((id = t.dataset.neto)) {
        var a = findAct(id); a.neto = toNumber(t.value); fmtInput(t); updateCalc(a); renderPreview();
      }
    });
    $("acts").addEventListener("click", function (e) {
      var id = e.target.dataset && e.target.dataset.del;
      if (!id) return;
      state.actividades = state.actividades.filter(function (a) { return a.id !== id; });
      renderActs(); renderPreview();
    });
    $("addAct").addEventListener("click", function () {
      state.actividades.push({ id: uid(), desc: "", neto: 0 });
      renderActs(); renderPreview();
      var ta = document.querySelectorAll("#acts textarea");
      if (ta.length) ta[ta.length - 1].focus();
    });

    $("anticipoOn").addEventListener("change", function () {
      state.anticipoOn = this.checked; syncControls(); renderPreview();
    });
    $("anticipo").addEventListener("input", function () {
      state.anticipo = toNumber(this.value); fmtInput(this); syncControls(); renderPreview();
    });

    $("btnPdf").addEventListener("click", function () { exportPdf("download"); });
    $("btnShare").addEventListener("click", function () { exportPdf("share"); });
    $("btnNew").addEventListener("click", function () {
      state = blankState(); editing = null;
      syncControls(); renderActs(); renderPreview();
      window.scrollTo({ top: 0, behavior: "smooth" });
      refreshNext();
      toast("Cotización nueva lista.");
    });

    $("history").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]");
      if (!b) return;
      var item = lsGet(LS_HISTORY, []).filter(function (h) { return h.id === b.dataset.id; })[0];
      if (!item) return;
      if (b.dataset.act === "open") openFromHistory(item);
      if (b.dataset.act === "pdf") exportPdf("download", item);
      if (b.dataset.act === "del") {
        if (!confirm("¿Borrar " + item.numero + " del historial? El número no se reutiliza.")) return;
        lsSet(LS_HISTORY, lsGet(LS_HISTORY, []).filter(function (h) { return h.id !== item.id; }));
        if (editing && editing.id === item.id) editing = null;
        renderHistory(); renderPreview();
      }
    });
    window.addEventListener("resize", fitPreview);
  }

  function syncControls() {
    $("cliente").value = state.cliente; $("nit").value = state.nit; $("fecha").value = state.fecha;
    $("inicio").value = state.inicio; $("duracion").value = state.duracion; $("validez").value = state.validez;
    $("motivo").value = state.motivo;
    document.querySelectorAll(".seg-btn").forEach(function (b) { b.classList.toggle("is-on", b.dataset.logo === state.logoPos); });
    document.querySelectorAll("#retChips .chip").forEach(function (c) { c.classList.toggle("is-on", Number(c.dataset.ret) === Number(state.retencion)); });
    $("retencion").value = state.retencion;
    $("anticipoOn").checked = state.anticipoOn;
    $("anticipoBox").hidden = !state.anticipoOn;
    if (document.activeElement !== $("anticipo")) $("anticipo").value = state.anticipo ? "$ " + money.format(state.anticipo) : "";
    $("anticipoWarn").hidden = !(state.anticipoOn && state.anticipo > totals(state).total && totals(state).total > 0);
  }

  /* ---------- historial ---------- */
  function renderHistory() {
    var list = lsGet(LS_HISTORY, []);
    var ul = $("history");
    $("historyEmpty").hidden = list.length > 0;
    ul.innerHTML = list.map(function (h) {
      return '<li><div class="h-main"><div class="h-num">' + esc(h.numero) + " · " + cop(h.total) + '</div><div class="h-sub">' +
        esc(h.cliente || "Sin cliente") + " · " + esc(fechaLarga(h.fecha)) + '</div></div><div class="h-actions">' +
        '<button class="h-btn" data-act="open" data-id="' + h.id + '">Abrir</button>' +
        '<button class="h-btn" data-act="pdf" data-id="' + h.id + '">PDF</button>' +
        '<button class="h-btn del" data-act="del" data-id="' + h.id + '">Borrar</button></div></li>';
    }).join("");
  }
  function openFromHistory(item) {
    state = JSON.parse(JSON.stringify(item.data));
    editing = { id: item.id, numero: item.numero };
    syncControls(); renderActs(); renderPreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Abriste " + item.numero + ". Al descargar se actualiza esa misma cotización.");
  }
  function saveToHistory(numero) {
    var list = lsGet(LS_HISTORY, []);
    var t = totals(state);
    var base = { fecha: state.fecha, cliente: state.cliente.trim(), total: t.total, data: JSON.parse(JSON.stringify(state)) };
    if (editing) {
      list = list.map(function (h) {
        return h.id === editing.id ? Object.assign({ id: h.id, numero: h.numero }, base) : h;
      });
    } else {
      var item = Object.assign({ id: uid(), numero: numero }, base);
      list.unshift(item);
      editing = { id: item.id, numero: numero };
    }
    lsSet(LS_HISTORY, list.slice(0, 200));
    renderHistory();
    renderPreview();
  }

  /* ---------- PDF ---------- */
  function validate() {
    if (!state.cliente.trim()) { toast("Escribe el nombre del cliente (Paso 1).", true); $("cliente").focus(); return false; }
    if (!totals(state).total) { toast("Agrega al menos una actividad con valor (Paso 3).", true); return false; }
    return true;
  }
  function safeName(s) { return String(s).replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim(); }

  function buildPdf(s, numero) {
    var holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-10000px;top:0;width:" + DOC_W + "px;background:#fff;z-index:-1";
    holder.innerHTML = docHTML(s, numero);
    document.body.appendChild(holder);
    var node = holder.firstChild;
    var imgs = holder.querySelectorAll("img");
    var loaded = Array.prototype.map.call(imgs, function (im) {
      return im.complete ? Promise.resolve() : new Promise(function (r) { im.onload = im.onerror = r; });
    });
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    return Promise.all(loaded.concat([fontsReady])).then(function () {
      return html2canvas(node, { scale: 3, backgroundColor: "#ffffff", useCORS: true, width: DOC_W, windowWidth: DOC_W, logging: false });
    }).then(function (canvas) {
      document.body.removeChild(holder);
      var jsPDF = window.jspdf.jsPDF;
      var pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
      var pageHpx = Math.floor(canvas.width * 297 / 210);
      var pages = Math.max(1, Math.ceil((canvas.height - 2) / pageHpx));
      for (var p = 0; p < pages; p++) {
        var sliceH = Math.min(pageHpx, canvas.height - p * pageHpx);
        var c = document.createElement("canvas");
        c.width = canvas.width; c.height = sliceH;
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(canvas, 0, p * pageHpx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (p > 0) pdf.addPage();
        pdf.addImage(c.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, sliceH * 210 / canvas.width, undefined, "FAST");
      }
      return pdf;
    }).catch(function (err) {
      if (holder.parentNode) holder.parentNode.removeChild(holder);
      throw err;
    });
  }

  var busy = false;
  function setBusy(b) {
    busy = b;
    $("btnPdf").disabled = b; $("btnShare").disabled = b;
  }
  function exportPdf(mode, fromItem) {
    if (busy) return;
    var s, p, offline = false;
    if (fromItem) {
      s = fromItem.data;
      p = Promise.resolve(fromItem.numero);
    } else {
      if (!validate()) return;
      s = JSON.parse(JSON.stringify(state));
      var total = totals(s).total, cli = s.cliente.trim();
      if (editing) {
        window.JRRegistro.actualizar("cotizacion", editing.numero, s.fecha, cli, total);
        p = Promise.resolve(editing.numero);
      } else {
        p = window.JRRegistro.registrar("cotizacion", s.fecha, cli, total).then(function (r) {
          offline = r.offline;
          return r.numero;
        });
      }
      p = p.then(function (numero) { saveToHistory(numero); refreshNext(); return numero; });
    }
    setBusy(true);
    p.then(function (numero) {
      return buildPdf(s, numero).then(function (pdf) {
        var name = "Cotización " + numero + (s.cliente.trim() ? " - " + safeName(s.cliente.trim()) : "") + ".pdf";
        if (mode === "share") return shareOrFallback(pdf, name, numero, s);
        pdf.save(name);
        toast(offline ? "Listo: " + name + ". Sin conexión: se avisará al panel cuando vuelva internet." : "Listo: " + name);
      });
    }).catch(function (err) {
      console.error(err);
      toast("No se pudo generar el PDF. Intenta de nuevo.", true);
    }).then(function () { setBusy(false); });
  }
  function shareOrFallback(pdf, name, numero, s) {
    var blob = pdf.output("blob");
    var file = new File([blob], name, { type: "application/pdf" });
    var text = "Hola, te comparto la cotización " + numero + " de " + CFG.empresa + ".";
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: "Cotización " + numero, text: text }).catch(function (e) {
        if (e && e.name === "AbortError") return;
        throw e;
      });
    }
    pdf.save(name);
    var subject = encodeURIComponent("Cotización " + numero + " · " + CFG.empresa);
    var body = encodeURIComponent(text + "\n\nAdjunta el PDF que se acaba de descargar.\n\n" + CFG.empresa + " · " + CFG.telefono);
    window.location.href = "mailto:?subject=" + subject + "&body=" + body;
    toast("Se descargó el PDF. Adjúntalo al correo.");
  }

  /* ---------- arranque ---------- */
  function init() {
    var tel = $("topTel"), wa = $("topWa");
    tel.href = "tel:+57" + CFG.telefono.replace(/\D/g, "");
    $("topTelText").textContent = CFG.telefono;
    wa.href = "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent("Hola, quiero cotizar un servicio con " + CFG.empresa);
    bindForm();
    syncControls(); renderActs(); renderHistory(); renderPreview();
    refreshNext();
    if (window.JRRegistro) window.JRRegistro.vaciarCola();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview);
  }
  document.addEventListener("DOMContentLoaded", init);
})();
