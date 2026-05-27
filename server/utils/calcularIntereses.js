export function ahoraCol() {
  const ahora = new Date();
  const col = new Date(
    ahora.toLocaleString('en-US', { timeZone: 'America/Bogota' })
  );
  col.setHours(0, 0, 0, 0);
  return col;
}

function obtenerFechaInicioMes(fechaBase, mesesSumar) {
  const [y, m, d] = [fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate()]
  const v = new Date(y, m + mesesSumar, d)
  if (v.getDate() !== d) {
    v.setDate(0)
  }
  v.setHours(0, 0, 0, 0)
  return v
}

function calcularProximoCobro(fechaInicio) {
  const inicio = new Date(fechaInicio)
  const ahora = ahoraCol()

  const proximo = new Date(inicio)
  proximo.setFullYear(ahora.getFullYear())
  proximo.setMonth(ahora.getMonth())

  if (proximo <= ahora) {
    proximo.setMonth(proximo.getMonth() + 1)
  }

  return proximo
}

function calcularIntereses(prestamo, abonos) {
  const capitalOriginal = parseFloat(prestamo.capital_original)
  const tasa = parseFloat(prestamo.tasa_interes)
  const fechaInicio = new Date(prestamo.fecha_inicio)
  const interesMensual = capitalOriginal * (tasa / 100)

  const hoy = ahoraCol()

  const diaOrigen = fechaInicio.getDate()
  const mesOrigen = fechaInicio.getMonth()
  const anioOrigen = fechaInicio.getFullYear()

  function fechaVencimientoPeriodo(periodos) {
    const v = new Date(anioOrigen, mesOrigen + periodos, diaOrigen)
    if (v.getDate() !== diaOrigen) {
      v.setDate(0)
    }
    v.setHours(0, 0, 0, 0)
    return v
  }

  let periodosVencidos = 0
  let proximoVencimiento = fechaVencimientoPeriodo(1)

  while (true) {
    const vencimientoConGracia = new Date(proximoVencimiento)
    vencimientoConGracia.setDate(vencimientoConGracia.getDate() + 2)
    if (hoy <= vencimientoConGracia) break
    periodosVencidos++
    proximoVencimiento = fechaVencimientoPeriodo(periodosVencidos + 1)
  }

  const totalPeriodos = 1 + periodosVencidos
  const interesAcumulado = interesMensual * totalPeriodos

  const totalInteresesPagados = (abonos || [])
    .filter(a => a.tipo === 'interes')
    .reduce((sum, a) => sum + parseFloat(a.monto), 0)

  const totalAbonoCapital = (abonos || [])
    .filter(a => a.tipo === 'capital')
    .reduce((sum, a) => sum + parseFloat(a.monto), 0)

  const capitalPendiente = Math.max(0, capitalOriginal - totalAbonoCapital)
  const interesMensualActual = capitalPendiente > 0 ? capitalPendiente * (tasa / 100) : 0
  const interesPendiente = Math.max(interesAcumulado - totalInteresesPagados, 0)

  const diasTranscurridos = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24))
  const mesesReales = Math.floor(diasTranscurridos / 30)
  const diasRestantes = diasTranscurridos % 30

  let tiempoTexto = ''
  if (diasTranscurridos === 0) {
    tiempoTexto = 'hoy'
  } else if (mesesReales === 0) {
    tiempoTexto = `${diasTranscurridos} dia${diasTranscurridos !== 1 ? 's' : ''}`
  } else if (diasRestantes === 0) {
    tiempoTexto = `${mesesReales} mes${mesesReales !== 1 ? 'es' : ''} exacto${mesesReales !== 1 ? 's' : ''}`
  } else {
    tiempoTexto = `${mesesReales} mes${mesesReales !== 1 ? 'es' : ''} y ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`
  }

  return {
    capital_original: capitalOriginal,
    capital_pendiente: Math.round(capitalPendiente * 100) / 100,
    tasa_interes: tasa,
    interes_mensual_actual: Math.round(interesMensualActual * 100) / 100,
    total_intereses_generados: Math.round(interesAcumulado * 100) / 100,
    total_intereses_pagados: totalInteresesPagados,
    interes_pendiente: Math.round(interesPendiente * 100) / 100,
    total_abonado_capital: totalAbonoCapital,
    total_periodos: totalPeriodos,
    label: `${totalPeriodos} período${totalPeriodos !== 1 ? 's' : ''}`,
    dias_transcurridos: diasTranscurridos,
    tiempo_texto: tiempoTexto,
    proximo_vencimiento: proximoVencimiento.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric'
    }),
    dias_para_vencer: Math.ceil((proximoVencimiento - hoy) / (1000 * 60 * 60 * 24)),
    desglose: []
  }
}

export { calcularIntereses, obtenerFechaInicioMes, calcularProximoCobro }

// TEST — eliminar después
const testFechas = [
  '2026-05-01',
  '2026-04-27',
  '2026-03-15',
];
testFechas.forEach(f => {
  const p = { capital_original: 1000000, tasa_interes: 20, fecha_inicio: f };
  const r = calcularIntereses(p, []);
  console.log(`Inicio: ${f}`);
  console.log(`  Hoy Colombia: ${ahoraCol().toLocaleDateString('es-CO')}`);
  console.log(`  Períodos: ${r.total_periodos}`);
  console.log(`  Label: ${r.label}`);
  console.log(`  Próximo vencimiento: ${r.proximo_vencimiento}`);
  console.log('');
});
