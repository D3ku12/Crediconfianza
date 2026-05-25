function ahoraCol() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }))
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
  const ahora = ahoraCol()

  const mesesTranscurridos =
    (ahora.getFullYear() - fechaInicio.getFullYear()) * 12 +
    (ahora.getMonth() - fechaInicio.getMonth())

  const mesesACobrar = Math.max(mesesTranscurridos, 1)

  let capitalVigente = capitalOriginal
  let totalInteresesGenerados = 0
  const desglose = []

  for (let i = 0; i < mesesACobrar; i++) {
    const fechaMes = new Date(fechaInicio)
    fechaMes.setMonth(fechaInicio.getMonth() + i)

    const abonosCapital = (abonos || [])
      .filter(a => a.tipo === 'capital' && new Date(a.fecha) < fechaMes)
      .reduce((sum, a) => sum + parseFloat(a.monto), 0)

    capitalVigente = capitalOriginal - abonosCapital

    if (capitalVigente <= 0) break

    const interesEsteMes = capitalVigente * (tasa / 100)
    totalInteresesGenerados += interesEsteMes

    desglose.push({
      mes: i + 1,
      capital: Math.round(capitalVigente * 100) / 100,
      interes: Math.round(interesEsteMes * 100) / 100
    })
  }

  const totalInteresesPagados = (abonos || [])
    .filter(a => a.tipo === 'interes')
    .reduce((sum, a) => sum + parseFloat(a.monto), 0)

  const totalAbonoCapital = (abonos || [])
    .filter(a => a.tipo === 'capital')
    .reduce((sum, a) => sum + parseFloat(a.monto), 0)

  const capitalPendiente = Math.max(0, capitalVigente)
  const interesMensualActual = capitalPendiente > 0 ? capitalPendiente * (tasa / 100) : 0
  const interesPendiente = Math.max(totalInteresesGenerados - totalInteresesPagados, 0)

  const proximoVencimiento = calcularProximoCobro(prestamo.fecha_inicio)
  const hoy = ahoraCol()
  const diasParaVencer = Math.ceil((proximoVencimiento - hoy) / (1000 * 60 * 60 * 24))

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
    total_intereses_generados: Math.round(totalInteresesGenerados * 100) / 100,
    total_intereses_pagados: totalInteresesPagados,
    interes_pendiente: Math.round(interesPendiente * 100) / 100,
    total_abonado_capital: totalAbonoCapital,
    dias_transcurridos: diasTranscurridos,
    tiempo_texto: tiempoTexto,
    proximo_vencimiento: proximoVencimiento.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric'
    }),
    dias_para_vencer: diasParaVencer,
    desglose
  }
}

export { calcularIntereses, ahoraCol, obtenerFechaInicioMes, calcularProximoCobro }
