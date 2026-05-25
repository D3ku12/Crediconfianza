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

  // ---- ENCABEZADO PROFESIONAL ----
  doc.setFillColor(108, 99, 255);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DE CUENTA', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Fecha: ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'long', year: 'numeric' })}`,
    pageWidth / 2, 25, { align: 'center' }
  );

  // ---- DATOS DEL CLIENTE ----
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL CLIENTE', 14, 48);

  autoTable(doc, {
    startY: 52,
    body: [
      ['Cliente',      prestamo.deudor],
      ['Teléfono',     prestamo.telefono || '—'],
      ['Fecha inicio', new Date(prestamo.fecha_inicio).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })],
      ['Tasa mensual', `${prestamo.tasa_interes}% mensual`],
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

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO', 14, doc.lastAutoTable.finalY + 12);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head: [['Concepto', 'Valor']],
    body: [
      ['Capital prestado',          formatCOP(prestamo.capital_original)],
      ['Capital pendiente',         formatCOP(prestamo.capital_pendiente)],
      ['Capital pagado',            formatCOP(totalPagadoCapital)],
      ['Interés mensual',           formatCOP(prestamo.interes_mensual)],
      ['Intereses pendientes',      formatCOP(prestamo.interes_pendiente)],
      ['Total intereses pagados',   formatCOP(totalPagadoInteres)],
      ['TOTAL DEUDA ACTUAL',        formatCOP(parseFloat(prestamo.capital_pendiente) + parseFloat(prestamo.interes_pendiente))],
      ['TOTAL PAGADO',              formatCOP(totalPagadoCapital + totalPagadoInteres)],
    ],
    headStyles: { fillColor: [108, 99, 255] },
    styles: { fontSize: 10 },
    didParseCell: (data) => {
      if (data.row.index === 6 || data.row.index === 7) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 255];
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
          new Date(a.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
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
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // ---- COMPARTIR O DESCARGAR ----
  const nombreArchivo = `estado-cuenta-${prestamo.deudor.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    navigator.share({
      title: `Estado de cuenta - ${prestamo.deudor}`,
      text: `Aquí tienes tu estado de cuenta actualizado.`,
      files: [pdfFile]
    }).catch(() => {
      doc.save(nombreArchivo);
    });
  } else {
    doc.save(nombreArchivo);
  }
}
