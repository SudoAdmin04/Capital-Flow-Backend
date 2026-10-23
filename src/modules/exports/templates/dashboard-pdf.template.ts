export function getDashboardPdfDefinition(overview: any): any {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    content: [
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              {
                text: 'CAPITAL FLOW',
                style: 'brandTitle',
              },
              {
                text: `Fecha de Emisión:\n${currentDate}`,
                alignment: 'right',
                style: 'brandDate',
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#0F172A' }] },
      { text: '', margin: [0, 5, 0, 10] },

      { text: 'Reporte Financiero Global', style: 'mainTitle', alignment: 'center' },
      { text: `Periodo: ${overview.range.label} (${overview.range.from} al ${overview.range.to})`, style: 'subtitle', alignment: 'center' },
      { text: '', margin: [0, 5, 0, 10] },

      { text: '1. Indicadores Clave de Desempeño (KPIs)', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*'],
          body: [
            [
              { text: 'Indicador Financiero', style: 'tableHeader' },
              { text: 'Valor Actual', style: 'tableHeader', alignment: 'right' },
            ],
            [
              { text: 'Saldo Neto', bold: true },
              {
                text: `$${Number(overview.kpis.net.net).toFixed(2)} (${overview.kpis.net.isDeficit ? 'Déficit' : 'Superávit'})`,
                alignment: 'right',
                color: overview.kpis.net.isDeficit ? '#DC2626' : '#16A34A',
                bold: true,
              },
            ],
            [
              { text: 'Ingresos Totales' },
              { text: `$${Number(overview.kpis.income.total).toFixed(2)}`, alignment: 'right', color: '#16A34A' },
            ],
            [
              { text: 'Egresos Totales' },
              { text: `$${Number(overview.kpis.expense.total).toFixed(2)}`, alignment: 'right', color: '#DC2626' },
            ],
            [
              { text: 'Disponibilidad Líquida' },
              { text: `$${Number(overview.kpis.liquidity.liquid).toFixed(2)}`, alignment: 'right', bold: true },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#0F172A' : rowIndex % 2 === 0 ? '#F8FAFC' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#CBD5E1',
          vLineColor: () => '#CBD5E1',
        },
        margin: [0, 5, 0, 15],
      },

      { text: '2. Resumen de Ingresos por Categoría', style: 'sectionHeader' },
      overview.incomeSummary.rows.length === 0
        ? { text: 'No hay registros de ingresos en el periodo seleccionado.', style: 'emptyText', margin: [0, 5, 0, 15] }
        : {
            table: {
              headerRows: 1,
              widths: ['*', 80, 80, 70],
              body: [
                [
                  { text: 'Categoría', style: 'tableHeader' },
                  { text: 'Presupuesto', style: 'tableHeader', alignment: 'right' },
                  { text: 'Real', style: 'tableHeader', alignment: 'right' },
                  { text: 'Estado', style: 'tableHeader', alignment: 'center' },
                ],
                ...overview.incomeSummary.rows.map((row: any) => [
                  { text: row.name },
                  { text: `$${Number(row.budget).toFixed(2)}`, alignment: 'right' },
                  { text: `$${Number(row.actual).toFixed(2)}`, alignment: 'right', bold: true },
                  { text: row.status, alignment: 'center' },
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
            margin: [0, 5, 0, 15],
          },

      { text: '3. Resumen de Egresos por Categoría', style: 'sectionHeader' },
      overview.expenseSummary.rows.length === 0
        ? { text: 'No hay registros de egresos en el periodo seleccionado.', style: 'emptyText', margin: [0, 5, 0, 15] }
        : {
            table: {
              headerRows: 1,
              widths: ['*', 80, 80, 70],
              body: [
                [
                  { text: 'Categoría', style: 'tableHeader' },
                  { text: 'Presupuesto', style: 'tableHeader', alignment: 'right' },
                  { text: 'Real', style: 'tableHeader', alignment: 'right' },
                  { text: 'Estado', style: 'tableHeader', alignment: 'center' },
                ],
                ...overview.expenseSummary.rows.map((row: any) => [
                  { text: row.name },
                  { text: `$${Number(row.budget).toFixed(2)}`, alignment: 'right' },
                  { text: `$${Number(row.actual).toFixed(2)}`, alignment: 'right', bold: true },
                  { text: row.status, alignment: 'center' },
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
            margin: [0, 5, 0, 15],
          },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'Capital Flow - Sistema de Finanzas Personales', fontSize: 8, color: '#94A3B8', margin: [40, 0, 0, 0] },
        { text: `Página ${currentPage} de ${pageCount}`, fontSize: 8, color: '#94A3B8', alignment: 'right', margin: [0, 0, 40, 0] },
      ],
    }),
    styles: {
      brandTitle: { fontSize: 16, bold: true, color: '#0F172A' },
      brandDate: { fontSize: 9, color: '#64748B' },
      mainTitle: { fontSize: 20, bold: true, color: '#0F172A', margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 11, color: '#64748B', margin: [0, 0, 0, 15] },
      sectionHeader: { fontSize: 13, bold: true, color: '#1E293B', margin: [0, 10, 0, 6] },
      tableHeader: { fontSize: 9, bold: true, color: '#FFFFFF', fillColor: '#0F172A', margin: [4, 4, 4, 4] },
      emptyText: { fontSize: 9, italics: true, color: '#64748B' },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      color: '#334155',
    },
  };
}
