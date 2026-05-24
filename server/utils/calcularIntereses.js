function ahoraCol() {
  const ahora = new Date();
  const utcMs = ahora.getTime() + ahora.getTimezoneOffset() * 60000;
  const colMs = utcMs - 5 * 3600000;
  const colDate = new Date(colMs);
  return new Date(colDate.getFullYear(), colDate.getMonth(), colDate.getDate());
}

function obtenerFechaInicioMes(fechaBase, mesesSumar) {
  const [y, m, d] = [fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate()];
  const v = new Date(y, m + mesesSumar, d);
  if (v.getDate() !== d) {
    v.setDate(0);
  }
  v.setHours(0, 0, 0, 0);
  return v;
}

function calcularIntereses(prestamo, abonos) {
  const capitalOriginal = parseFloat(prestamo.capital_original);
  const tasa = parseFloat(prestamo.tasa_interes);
  const fechaInicio = new Date(prestamo.fecha_inicio);
  fechaInicio.setHours(0, 0, 0, 0);

  const hoy = ahoraCol();

  // Ordenar abonos a capital por fecha ASC
  const abonosCapital = (abonos || [])
    .filter(a => a.tipo === 'capital')
    .map(a => {
      const f = new Date(a.fecha);
      f.setHours(0, 0, 0, 0);
      return { monto: parseFloat(a.monto), fecha: f };
    })
    .sort((a, b) => a.fecha - b.fecha);

  const totalAbonoCapital = abonosCapital.reduce((s, a) => s + a.monto, 0);
  const totalAbonoInteres = (abonos || [])
    .filter(a => a.tipo === 'interes')
    .reduce((s, a) => s + parseFloat(a.monto), 0);

  // Recorrer mes a mes desde fecha_inicio hasta hoy
  let totalInteresGenerado = 0;
  const desglose = [];
  let monthIndex = 0;
  let monthStart = obtenerFechaInicioMes(fechaInicio, 0);

  while (monthStart < hoy) {
    const monthEnd = obtenerFechaInicioMes(fechaInicio, monthIndex + 1);

    // Capital vigente = capital_original - suma de abonos a capital ANTERIORES a este mes
    let sumAbonosBeforeThisMonth = 0;
    for (const ab of abonosCapital) {
      if (ab.fecha < monthStart) {
        sumAbonosBeforeThisMonth += ab.monto;
      }
    }
    const capitalEsteMes = Math.max(0, capitalOriginal - sumAbonosBeforeThisMonth);

    if (capitalEsteMes <= 0) break;

    const interesEsteMes = capitalEsteMes * (tasa / 100);
    totalInteresGenerado += interesEsteMes;

    desglose.push({
      mes: monthIndex + 1,
      inicio: monthStart.toISOString().substring(0, 10),
      fin: monthEnd < hoy ? monthEnd.toISOString().substring(0, 10) : hoy.toISOString().substring(0, 10),
      capital: Math.round(capitalEsteMes * 100) / 100,
      interes: Math.round(interesEsteMes * 100) / 100,
      abonosCapitalEsteMes: abonosCapital
        .filter(ab => ab.fecha >= monthStart && ab.fecha < monthEnd)
        .map(ab => ab.monto)
    });

    monthIndex++;
    monthStart = obtenerFechaInicioMes(fechaInicio, monthIndex);
  }

  const capitalPendiente = Math.max(0, capitalOriginal - totalAbonoCapital);
  const interesPendiente = Math.max(0, totalInteresGenerado - totalAbonoInteres);
  const interesMensualActual = capitalPendiente > 0 ? capitalPendiente * (tasa / 100) : 0;

  // Tiempo transcurrido (informativo)
  const diasTranscurridos = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
  const mesesReales = Math.floor(diasTranscurridos / 30);
  const diasRestantes = diasTranscurridos % 30;

  let tiempoTexto = '';
  if (diasTranscurridos === 0) {
    tiempoTexto = 'hoy';
  } else if (mesesReales === 0) {
    tiempoTexto = `${diasTranscurridos} día${diasTranscurridos !== 1 ? 's' : ''}`;
  } else if (diasRestantes === 0) {
    tiempoTexto = `${mesesReales} mes${mesesReales !== 1 ? 'es' : ''} exacto${mesesReales !== 1 ? 's' : ''}`;
  } else {
    tiempoTexto = `${mesesReales} mes${mesesReales !== 1 ? 'es' : ''} y ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`;
  }

  const proximoVencimiento = obtenerFechaInicioMes(fechaInicio, monthIndex + 1);
  const diasParaVencer = Math.ceil((proximoVencimiento - hoy) / (1000 * 60 * 60 * 24));

  return {
    capital_original: capitalOriginal,
    capital_pendiente: capitalPendiente,
    tasa_interes: tasa,
    interes_mensual_actual: Math.round(interesMensualActual * 100) / 100,
    total_intereses_generados: Math.round(totalInteresGenerado * 100) / 100,
    total_intereses_pagados: totalAbonoInteres,
    interes_pendiente: Math.round(interesPendiente * 100) / 100,
    total_abonado_capital: totalAbonoCapital,
    dias_transcurridos: diasTranscurridos,
    tiempo_texto: tiempoTexto,
    proximo_vencimiento: proximoVencimiento.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric'
    }),
    dias_para_vencer: diasParaVencer,
    desglose
  };
}

module.exports = { calcularIntereses, ahoraCol, obtenerFechaInicioMes };
