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

export function generarEstadoCuentaPDF(prestamo, abonos = [], cliente = {}, nombreUsuario = 'Usuario') {
  if (!prestamo) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ---- ENCABEZADO ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DE CUENTA', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const fechaActual = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  doc.text(`Fecha: ${fechaActual}`, 14, 30);
  doc.text(`Usuario: ${nombreUsuario}`, 14, 36);

  // ---- DATOS DEL CLIENTE ----
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 14, 48);

  autoTable(doc, {
    startY: 52,
    body: [
      ['Nombre', prestamo.deudor],
      ['Teléfono', cliente.telefono || '—'],
      ['Documento', cliente.documento || '—'],
      ['Fecha inicio', formatDateDDMMYYYY(new Date(prestamo.fecha_inicio))],
      ['Tasa interés', `${prestamo.tasa_interes}% mensual`],
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
  const totalDeuda = parseFloat(prestamo.capital_pendiente) + parseFloat(prestamo.interes_pendiente);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO', 14, doc.lastAutoTable.finalY + 12);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    body: [
      ['Capital original', 'Capital pendiente', 'Capital pagado', ''],
      [
        formatCOP(prestamo.capital_original),
        formatCOP(prestamo.capital_pendiente),
        formatCOP(totalPagadoCapital),
        '',
      ],
      ['Interés mensual', 'Total intereses generados', 'Total intereses pagados', 'Intereses pendientes'],
      [
        formatCOP(prestamo.interes_mensual),
        formatCOP(prestamo.interes_acumulado || 0),
        formatCOP(totalPagadoInteres),
        formatCOP(prestamo.interes_pendiente),
      ],
      ['TOTAL PAGADO (capital + interés)', formatCOP(totalPagado), '', ''],
      ['TOTAL DEUDA ACTUAL', formatCOP(totalDeuda), '', ''],
    ],
    theme: 'grid',
    styles: { fontSize: 10, halign: 'center' },
    headStyles: { fillColor: [108, 99, 255] },
    didParseCell: (data) => {
      if (data.row.index === 0 || data.row.index === 2 || data.row.index === 4 || data.row.index === 5) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [240, 240, 255];
      }
      if (data.row.index === 5) {
        data.cell.styles.fillColor = [255, 240, 240];
      }
    }
  });

  // ---- HISTORIAL DE PAGOS ----
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTORIAL DE PAGOS', 14, doc.lastAutoTable.finalY + 12);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Fecha', 'Tipo', 'Monto', 'Nota']],
    body: abonos.length > 0
      ? abonos.map(a => [
          formatDateDDMMYYYY(new Date(a.fecha)),
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
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // ---- DESCARGAR ----
  const nombre = prestamo.deudor.toLowerCase().replace(/\s+/g, '-');
  const fecha = new Date().toISOString().split('T')[0];
  doc.save(`estado-cuenta-${nombre}-${fecha}.pdf`);
}
