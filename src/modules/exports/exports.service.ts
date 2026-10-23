import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts;
import { DashboardQueryDto } from '../dashboard/dto/dashboard-query.dto';
import { DashboardService } from '../dashboard/dashboard.service';
import { QueryTransactionsDto } from '../transactions/dto/transaction.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { getDashboardPdfDefinition, getTransactionsPdfDefinition } from './templates/pdf-templates';

@Injectable()
export class ExportsService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async generateDashboardPdf(userId: string, query: DashboardQueryDto): Promise<Buffer> {
    const overview = await this.dashboardService.overview(userId, query);
    const docDefinition = getDashboardPdfDefinition(overview);
    const pdfDoc = pdfMake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  async generateDashboardXlsx(userId: string, query: DashboardQueryDto): Promise<Buffer> {
    const overview = await this.dashboardService.overview(userId, query);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Capital Flow';

    const wsKpis = workbook.addWorksheet('Resumen KPIs');
    wsKpis.addRow(['Capital Flow - Reporte Financiero Global']);
    wsKpis.addRow([`Periodo: ${overview.range.label} (${overview.range.from} a ${overview.range.to})`]);
    wsKpis.addRow([]);
    wsKpis.addRow(['Indicador', 'Valor', 'Detalle']);
    wsKpis.addRow(['Saldo Neto', overview.kpis.net.net, overview.kpis.net.isDeficit ? 'Déficit' : 'Superávit']);
    wsKpis.addRow(['Ingresos Totales', overview.kpis.income.total, '']);
    wsKpis.addRow(['Egresos Totales', overview.kpis.expense.total, '']);
    wsKpis.addRow(['Disponibilidad Líquida', overview.kpis.liquidity.liquid, '']);

    const wsIncome = workbook.addWorksheet('Ingresos');
    wsIncome.addRow(['Categoría', 'Presupuesto', 'Real', 'Variación', 'Estado', 'Cumplimiento']);
    overview.incomeSummary.rows.forEach((r) => {
      wsIncome.addRow([r.name, r.budget, r.actual, r.variance, r.status, r.executionRate ? `${r.executionRate}%` : '-']);
    });
    wsIncome.addRow(['TOTALES', overview.incomeSummary.totalBudget, overview.incomeSummary.totalActual, overview.incomeSummary.totalVariance]);

    const wsExpense = workbook.addWorksheet('Egresos');
    wsExpense.addRow(['Categoría', 'Presupuesto', 'Real', 'Variación', 'Estado', 'Tasa']);
    overview.expenseSummary.rows.forEach((r) => {
      wsExpense.addRow([r.name, r.budget, r.actual, r.variance, r.status, r.executionRate ? `${r.executionRate}%` : '-']);
    });
    wsExpense.addRow(['TOTALES', overview.expenseSummary.totalBudget, overview.expenseSummary.totalActual, overview.expenseSummary.totalVariance]);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateTransactionsPdf(userId: string, query: QueryTransactionsDto): Promise<Buffer> {
    const result = await this.transactionsService.findAll(userId, { ...query, limit: 10000, page: 1 });
    const docDefinition = getTransactionsPdfDefinition(result);
    const pdfDoc = pdfMake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  async generateTransactionsXlsx(userId: string, query: QueryTransactionsDto): Promise<Buffer> {
    const result = await this.transactionsService.findAll(userId, { ...query, limit: 10000, page: 1 });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Capital Flow';

    const ws = workbook.addWorksheet('Transacciones');
    ws.addRow(['ID', 'Fecha', 'Tipo', 'Cuenta', 'Cuenta Destino', 'Categoría', 'Descripción', 'Monto', 'Método de Pago', 'Estado', 'Conciliado At']);

    result.items.forEach((tx) => {
      ws.addRow([
        tx.id,
        tx.date,
        tx.type,
        tx.account?.name ?? '',
        tx.destinationAccount?.name ?? '',
        tx.category?.name ?? '',
        tx.description ?? '',
        Number(tx.amount),
        tx.paymentMethod ?? '',
        tx.status,
        tx.reconciledAt ?? '',
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
