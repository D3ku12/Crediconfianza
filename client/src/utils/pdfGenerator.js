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

export function generarEstadoCuentaPDF(prestamo, abonos, nombreUsuario) {
  if (!prestamo || !abonos) {
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const mesAnio = formatDateDDMMYYYY(new Date());
  const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  doc.setFontSize(16);
  doc.text('Estado de Cuenta', margin, 20);

  doc.setFontSize(9);
  doc.text(`Generado: ${mesAnio} ${hora}`, margin, 28);
  doc.text(`Usuario: ${nombreUsuario}`, margin, 34);

  doc.setFontSize(12);
  doc.text('Datos del Deudor', margin, 45);

  doc.setFontSize(9);
  const deudorLines = [
    ['Nombre', prestamo.deudor],
    ['Fecha de inicio', formatDateDDMMYYYY(new Date(prestamo.fecha_inicio.split('T')[0]))],
    ['Capital original', formatCOP(prestamo.capital_original)],
    ['Capital pendiente', formatCOP(prestamo.capital_pendiente)],
    ['Tasa de interés mensual', `${parseFloat(prestamo.tasa_interes).toFixed(2)}%`],
    ['Interés mensual actual', formatCOP(prestamo.interes_mensual)],
    ['Intereses pendientes por pagar', formatCOP(prestamo.interes_pendiente)],
    ['Total intereses cobrados', formatCOP(prestamo.total_abonado_interes || 0)],
  ];

  const startY = 52;
  const col1X = margin;
  const col2X = margin + 70;

  deudorLines.forEach((line, i) => {
    const y = startY + i * 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text(line[0], col1X, y);
    doc.setFont('helvetica', 'normal');
    doc.text(line[1], col2X, y);
  });

  let nextY = startY + deudorLines.length * 5.5 + 8;

  const monthlyData = buildMonthlyBreakdown(prestamo, abonos);

  if (monthlyData.length > 0) {
    if (nextY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      nextY = 20;
    }

    autoTable(doc, {
      startY: nextY,
      head: [['Mes', 'Capital vigente', 'Interés generado', 'Abonos a interés', 'Abonos a capital', 'Saldo interés']],
      body: monthlyData.map(r => [
        r.mes,
        formatCOP(r.capitalVigente),
        formatCOP(r.interesGenerado),
        formatCOP(r.abonosInteres),
        formatCOP(r.abonosCapital),
        formatCOP(r.saldoInteres),
      ]),
      styles: { fontSize: 7 },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 28 },
      },
    });

    nextY = doc.lastAutoTable.finalY + 10;
  }

  if (abonos.length > 0) {
    if (nextY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      nextY = 20;
    }

    autoTable(doc, {
      startY: nextY,
      head: [['Fecha', 'Tipo', 'Monto', 'Nota']],
      body: abonos.map(a => [
        formatDateDDMMYYYY(new Date(a.fecha.split('T')[0])),
        a.tipo === 'interes' ? 'Interés' : 'Capital',
        formatCOP(a.monto),
        a.nota || '—',
      ]),
      styles: { fontSize: 7.5 },
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontSize: 7.5,
      },
    });

    nextY = doc.lastAutoTable.finalY + 10;
  } else {
    if (nextY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      nextY = 20;
    }
    doc.setFontSize(9);
    doc.text('No se han registrado abonos para este préstamo.', margin, nextY);
    nextY += 8;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.text(`Página ${i} de ${pageCount}`, margin, footerY);
    doc.text('Documento generado automáticamente', pageWidth - margin, footerY, { align: 'right' });
  }

  const nombreArchivo = `estado-cuenta-${prestamo.deudor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${formatDateDDMMYYYY(new Date()).replace(/\//g, '-')}.pdf`;
  doc.save(nombreArchivo);
}
