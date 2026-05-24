import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatCOP(valor) {
  if (valor == null || isNaN(valor)) valor = 0;
  const num = Math.round(Number(valor));
  return '$ ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDateDDMMYYYY(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getMonthName(monthIndex) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthIndex];
}

function buildMonthlyBreakdown(prestamo, abonos) {
  const tasa = parseFloat(prestamo.tasa_interes) / 100;
  const capitalOriginal = parseFloat(prestamo.capital_original);
  let capitalVigente = capitalOriginal;

  const startDate = new Date(prestamo.fecha_inicio.split('T')[0]);
  const today = new Date();
  const rows = [];

  const abonosByMonth = {};
  for (const a of abonos) {
    const d = new Date(a.fecha.split('T')[0]);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!abonosByMonth[key]) abonosByMonth[key] = [];
    abonosByMonth[key].push(a);
  }

  let saldoInteres = 0;

  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const totalMonths = (today.getFullYear() - startYear) * 12 + (today.getMonth() - startMonth) + 1;

  for (let i = 0; i < totalMonths; i++) {
    const currentDate = new Date(startYear, startMonth + i, 1);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    const label = `${getMonthName(month)} ${year}`;
    const interesGenerado = capitalVigente * tasa;

    const monthAbonos = abonosByMonth[key] || [];
    const abonosInteres = monthAbonos
      .filter(a => a.tipo === 'interes')
      .reduce((sum, a) => sum + parseFloat(a.monto), 0);
    const abonosCapital = monthAbonos
      .filter(a => a.tipo === 'capital')
      .reduce((sum, a) => sum + parseFloat(a.monto), 0);

    saldoInteres = saldoInteres + interesGenerado - abonosInteres;

    rows.push({
      mes: label,
      capitalVigente,
      interesGenerado,
      abonosInteres,
      abonosCapital,
      saldoInteres,
    });

    capitalVigente -= abonosCapital;
    if (capitalVigente < 0) capitalVigente = 0;
  }

  return rows;
}

export function generarEstadoCuentaPDF(prestamo, abonos = [], cliente = {}, nombreUsuario = 'Usuario') {
  if (!prestamo) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- ENCABEZADO ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DE CUENTA', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`, 14, 30);
  doc.text(`Generado por: ${nombreUsuario}`, 14, 36);

  // ---- DATOS DEL CLIENTE ----
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL CLIENTE', 14, 48);

  autoTable(doc, {
    startY: 52,
    body: [
      ['Cliente', prestamo.deudor],
      ['Teléfono', cliente.telefono || '—'],
      ['Documento', cliente.documento || '—'],
      ['Fecha inicio', new Date(prestamo.fecha_inicio).toLocaleDateString('es-CO')],
      ['Tasa de interés', `${prestamo.tasa_interes}% mensual`],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
  });

  // ---- RESUMEN FINANCIERO ----
  const totalPagadoCapital = abonos
    .filter(a => a.tipo === 'capital')
    .reduce((s, a) => s + parseFloat(a.monto), 0);

  const totalPagadoInteres = abonos
    .filter(a => a.tipo === 'interes')
    .reduce((s, a) => s + parseFloat(a.monto), 0);

  const totalPagado = totalPagadoCapital + totalPagadoInteres;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO', 14, doc.lastAutoTable.finalY + 12);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Concepto', 'Valor']],
    body: [
      ['Capital original prestado',     formatCOP(prestamo.capital_original)],
      ['Capital pendiente por pagar',    formatCOP(prestamo.capital_pendiente)],
      ['Capital pagado',                 formatCOP(totalPagadoCapital)],
      ['Interés mensual actual',         formatCOP(prestamo.interes_mensual)],
      ['Total intereses generados',      formatCOP(prestamo.interes_acumulado)],
      ['Total intereses pagados',        formatCOP(totalPagadoInteres)],
      ['Intereses pendientes',           formatCOP(prestamo.interes_pendiente)],
      ['TOTAL PAGADO (capital + interés)', formatCOP(totalPagado)],
      ['TOTAL DEUDA ACTUAL',             formatCOP(parseFloat(prestamo.capital_pendiente) + parseFloat(prestamo.interes_pendiente))],
    ],
    headStyles: { fillColor: [108, 99, 255] },
    bodyStyles: { fontSize: 10 },
    didParseCell: (data) => {
      if (data.row.index === 7 || data.row.index === 8) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 255];
      }
    }
  });

  // ---- HISTORIAL DE ABONOS ----
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTORIAL DE PAGOS', 14, doc.lastAutoTable.finalY + 12);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Fecha', 'Tipo', 'Monto', 'Nota']],
    body: abonos.length > 0
      ? abonos.map(a => [
          new Date(a.fecha).toLocaleDateString('es-CO'),
          a.tipo === 'interes' ? 'Interés' : 'Capital',
          formatCOP(a.monto),
          a.nota || '—'
        ])
      : [['—', '—', '—', 'Sin pagos registrados']],
    headStyles: { fillColor: [108, 99, 255] },
    styles: { fontSize: 9 }
  });

  // ---- PIE DE PÁGINA ----
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount} — Documento generado automáticamente`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // ---- DESCARGAR ----
  const nombre = prestamo.deudor.toLowerCase().replace(/\s+/g, '-');
  const fecha = new Date().toISOString().split('T')[0];
  doc.save(`estado-cuenta-${nombre}-${fecha}.pdf`);
}
