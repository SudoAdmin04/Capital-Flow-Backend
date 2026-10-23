import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser, UsuarioActual } from '../../common/decorators/usuario-actual.decorator';
import { DashboardQueryDto } from '../dashboard/dto/dashboard-query.dto';
import { QueryTransactionsDto } from '../transactions/dto/transaction.dto';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Get('dashboard/pdf')
  @ApiOperation({
    summary: 'Exportar Dashboard completo a PDF',
    description: 'Genera y descarga un documento PDF profesional con el resumen general del dashboard (KPIs, ingresos, egresos, saldos) para el periodo y filtros indicados.',
  })
  async exportDashboardPdf(
    @UsuarioActual() user: AuthUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateDashboardPdf(user.userId, query);
    const filename = `reporte-dashboard-${query.year ?? 'actual'}-${query.month ?? 'actual'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('dashboard/xlsx')
  @ApiOperation({
    summary: 'Exportar Dashboard completo a Excel (XLSX)',
    description: 'Genera y descarga una hoja de cálculo Excel con múltiples pestañas conteniendo el resumen de KPIs, ingresos, egresos y estado financiero global.',
  })
  async exportDashboardXlsx(
    @UsuarioActual() user: AuthUser,
    @Query() query: DashboardQueryDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateDashboardXlsx(user.userId, query);
    const filename = `reporte-dashboard-${query.year ?? 'actual'}-${query.month ?? 'actual'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('transactions/pdf')
  @ApiOperation({
    summary: 'Exportar listado de transacciones a PDF',
    description: 'Genera y descarga un reporte PDF con el listado de transacciones filtradas por fechas, tipo, estado, categoría y cuenta.',
  })
  async exportTransactionsPdf(
    @UsuarioActual() user: AuthUser,
    @Query() query: QueryTransactionsDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateTransactionsPdf(user.userId, query);
    const filename = `reporte-transacciones.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Get('transactions/xlsx')
  @ApiOperation({
    summary: 'Exportar listado de transacciones a Excel (XLSX)',
    description: 'Genera y descarga una hoja de cálculo Excel con todas las transacciones filtradas para análisis detallado y contabilidad.',
  })
  async exportTransactionsXlsx(
    @UsuarioActual() user: AuthUser,
    @Query() query: QueryTransactionsDto,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateTransactionsXlsx(user.userId, query);
    const filename = `reporte-transacciones.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
