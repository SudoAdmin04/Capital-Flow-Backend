export function getTransactionsPdfDefinition(result: any): any {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 45],
    content: [
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'CAPITAL FLOW', style: 'brandTitle' },
              { text: `Fecha de Emisión:\n${currentDate}`, alignment: 'right', style: 'brandDate' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 775, y2: 0, lineWidth: 1.5, lineColor: '#0F172A' }] },
      { text: '', margin: [0, 5, 0, 5] },

      { text: 'Registro Detallado de Transacciones', style: 'mainTitle', alignment: 'center' },
      { text: `Total de registros encontrados: ${result.total}`, style: 'subtitle', alignment: 'center' },
      { text: '', margin: [0, 5, 0, 10] },

      {
        table: {
          headerRows: 1,
          widths: [65, 55, 100, 110, '*', 70, 75, 55],
          body: [
            [
              { text: 'Fecha', style: 'tableHeader' },
              { text: 'Tipo', style: 'tableHeader' },
              { text: 'Cuenta', style: 'tableHeader' },
              { text: 'Categoría', style: 'tableHeader' },
              { text: 'Descripción', style: 'tableHeader' },
              { text: 'Monto', style: 'tableHeader', alignment: 'right' },
              { text: 'Método', style: 'tableHeader' },
              { text: 'Estado', style: 'tableHeader' },
            ],
            ...result.items.map((tx: any) => [
              { text: tx.date, fontSize: 8 },
              { text: tx.type, fontSize: 8 },
              { text: tx.account?.name ?? '-', fontSize: 8 },
              { text: tx.category?.name ?? '-', fontSize: 8 },
              { text: tx.description || '-', fontSize: 8 },
              {
                text: `$${Number(tx.amount).toFixed(2)}`,
                alignment: 'right',
                fontSize: 8,
                bold: true,
                color: tx.type === 'INGRESO' ? '#16A34A' : '#DC2626',
              },
              { text: tx.paymentMethod ?? '-', fontSize: 8 },
              { text: tx.status, fontSize: 8 },
            ]),
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#0F172A' : rowIndex % 2 === 0 ? '#F8FAFC' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#CBD5E1',
          vLineColor: () => '#CBD5E1',
        },
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'Capital Flow - Sistema de Finanzas Personales', fontSize: 8, color: '#94A3B8', margin: [30, 0, 0, 0] },
        { text: `Página ${currentPage} de ${pageCount}`, fontSize: 8, color: '#94A3B8', alignment: 'right', margin: [0, 0, 30, 0] },
      ],
    }),
    styles: {
      brandTitle: { fontSize: 16, bold: true, color: '#0F172A' },
      brandDate: { fontSize: 9, color: '#64748B' },
      mainTitle: { fontSize: 16, bold: true, color: '#0F172A', margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 10, color: '#64748B', margin: [0, 0, 0, 10] },
      tableHeader: { fontSize: 9, bold: true, color: '#FFFFFF', fillColor: '#0F172A', margin: [4, 4, 4, 4] },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 8,
      color: '#334155',
    },
  };
}
