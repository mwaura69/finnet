import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import ExcelJS from 'exceljs';
import { db } from '../../../db/index.js';
import { ApiError } from '../../../utils/ApiError.js';
import { PortfolioAccess, atomic } from '../../../domain/business-access.js';
import { readLedger } from '../../../domain/transaction-ledger.js';
import { summarize } from '../../../domain/holdings.js';
import {
  queueTransactionNotification,
  receiptNumber,
} from '../../../domain/transaction-notifications.js';
import { transactionSchema } from './transaction.schema.js';
import type { TransactionInput, TransactionDto } from './transaction.types.js';
export interface TransactionFilters {
  instrument?: string;
  type?: 'BUY' | 'SELL' | '';
  from?: string;
  to?: string;
  sort?: 'tradeDate' | 'instrument' | 'quantity' | 'unitPrice' | 'amount';
  direction?: 'asc' | 'desc';
}
export class TransactionService {
  private access: PortfolioAccess;
  constructor(private connection: DatabaseSync = db) {
    this.access = new PortfolioAccess(connection);
  }
  list(userId: string, portfolioId: string, filters: TransactionFilters = {}) {
    this.access.require(userId, portfolioId);
    const rows = readLedger(this.connection, portfolioId).filter(
      (t) =>
        (!filters.instrument ||
          t.instrument.toLowerCase().includes(filters.instrument.toLowerCase())) &&
        (!filters.type || t.type === filters.type) &&
        (!filters.from || t.tradeDate >= filters.from) &&
        (!filters.to || t.tradeDate <= filters.to),
    );
    if (filters.sort) {
      const key = filters.sort;
      rows.sort((a, b) => {
        const av = key === 'amount' ? a.quantity * a.unitPrice : a[key],
          bv = key === 'amount' ? b.quantity * b.unitPrice : b[key];
        return (
          (typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv))) * (filters.direction === 'asc' ? 1 : -1)
        );
      });
    }
    return rows;
  }
  create(userId: string, portfolioId: string, input: TransactionInput) {
    const parsed = transactionSchema.parse(input);
    if (
      !Number.isSafeInteger(Math.round(parsed.unitPrice * 100)) ||
      parsed.quantity * Math.round(parsed.unitPrice * 100) > Number.MAX_SAFE_INTEGER
    )
      throw new ApiError(
        422,
        'AMOUNT_TOO_LARGE',
        'The transaction amount exceeds the supported precision.',
      );
    return atomic(this.connection, () => {
      const p = this.access.require(userId, portfolioId, 'write'),
        ledger = readLedger(this.connection, portfolioId);
      const latest = ledger.reduce((n, t) => Math.max(n, Date.parse(t.createdAt) || 0), 0);
      const transaction: TransactionDto = {
        ...parsed,
        id: randomUUID(),
        createdAt: new Date(Math.max(Date.now(), latest + 1)).toISOString(),
      };
      summarize([...ledger, transaction]);
      this.connection
        .prepare(
          'INSERT INTO transactions(id,portfolio_id,instrument,type,quantity,unit_price_minor,trade_date,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?)',
        )
        .run(
          transaction.id,
          portfolioId,
          transaction.instrument,
          transaction.type,
          transaction.quantity,
          Math.round(transaction.unitPrice * 100),
          transaction.tradeDate,
          transaction.createdAt,
          userId,
        );
      queueTransactionNotification(this.connection, userId, p, transaction, 'recorded');
      return transaction;
    });
  }
  remove(userId: string, transactionId: string) {
    atomic(this.connection, () => {
      const row = this.connection
        .prepare('SELECT portfolio_id FROM transactions WHERE id=?')
        .get(transactionId);
      if (!row)
        throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'This transaction could not be found.');
      const p = this.access.require(userId, String(row['portfolio_id']), 'write');
      const ledger = readLedger(this.connection, p.id),
        transaction = ledger.find((t) => t.id === transactionId)!;
      try {
        summarize(ledger.filter((t) => t.id !== transactionId));
      } catch (error) {
        if (error instanceof ApiError && error.code === 'INSUFFICIENT_HOLDINGS')
          throw new ApiError(
            409,
            'LEDGER_CONFLICT',
            'Cannot delete this transaction: ' + error.message,
          );
        throw error;
      }
      this.connection.prepare('DELETE FROM transactions WHERE id=?').run(transactionId);
      queueTransactionNotification(this.connection, userId, p, transaction, 'deleted');
    });
  }
  receipt(userId: string, transactionId: string) {
    const row = this.connection
      .prepare('SELECT portfolio_id,created_by FROM transactions WHERE id=?')
      .get(transactionId);
    if (!row)
      throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'This transaction could not be found.');
    const p = this.access.require(userId, String(row['portfolio_id']));
    const transaction = readLedger(this.connection, p.id).find((t) => t.id === transactionId)!;
    const analyst = this.connection
      .prepare('SELECT name,email FROM users WHERE id=?')
      .get(String(row['created_by'] || p.user_id));
    return {
      receiptNumber: receiptNumber(transactionId),
      issuedAt: transaction.createdAt,
      portfolio: {
        id: p.id,
        name: p.name,
        clientName: p.client_name,
        baseCurrency: p.base_currency,
      },
      transaction: {
        ...transaction,
        totalValue: Math.round(transaction.quantity * transaction.unitPrice * 100) / 100,
      },
      analyst: {
        name: String(analyst?.['name'] || 'Investment analyst'),
        email: String(analyst?.['email'] || ''),
      },
      disclaimer:
        'Transaction record only. Not a tax invoice or proof of settlement. Values use the recorded trade price.',
    };
  }
  async exportWorkbook(userId: string, portfolioId: string, filters: TransactionFilters = {}) {
    const p = this.access.require(userId, portfolioId),
      rows = this.list(userId, portfolioId, filters),
      workbook = new ExcelJS.Workbook();
    workbook.creator = 'FinTrack by Finnet Technologies';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Transactions', {
      views: [{ state: 'frozen', ySplit: 7 }],
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });
    sheet.columns = [
      { width: 22 },
      { width: 12 },
      { width: 18 },
      { width: 22 },
      { width: 24 },
      { width: 14 },
      { width: 18 },
    ];
    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'FinTrack by Finnet Technologies';
    sheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FF0F3656' } };
    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = p.name + ' | ' + p.client_name;
    sheet.mergeCells('A3:G3');
    sheet.getCell('A3').value =
      'Base currency: ' + p.base_currency + ' | Exported: ' + new Date().toISOString();
    sheet.mergeCells('A4:G4');
    sheet.getCell('A4').value =
      'Transaction record only; not a tax invoice or proof of settlement.';
    sheet.mergeCells('A5:G5');
    sheet.getCell('A5').value =
      `Filters: instrument=${filters.instrument || 'all'}; type=${filters.type || 'all'}; from=${filters.from || 'any'}; to=${filters.to || 'any'}`;
    const header = sheet.getRow(7);
    header.values = [
      'Instrument',
      'Type',
      'Quantity',
      'Unit price',
      'Total value',
      'Currency',
      'Trade date',
    ];
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3656' } };
    header.height = 24;
    rows.forEach((t) => {
      const row = sheet.addRow([
        t.instrument,
        t.type,
        t.quantity,
        t.unitPrice,
        Math.round(t.quantity * t.unitPrice * 100) / 100,
        p.base_currency,
        new Date(t.tradeDate + 'T00:00:00Z'),
      ]);
      row.getCell(3).numFmt = '#,##0.####';
      row.getCell(4).numFmt = `"${p.base_currency}" #,##0.00`;
      row.getCell(5).numFmt = `"${p.base_currency}" #,##0.00`;
      row.getCell(7).numFmt = 'yyyy-mm-dd';
      [3, 4, 5].forEach((n) => (row.getCell(n).alignment = { horizontal: 'right' }));
    });
    sheet.autoFilter = { from: 'A7', to: `G${Math.max(7, 7 + rows.length)}` };
    const total = sheet.addRow([
      'Filtered total',
      '',
      '',
      '',
      rows.length
        ? {
            formula: `SUM(E8:E${7 + rows.length})`,
            result: rows.reduce(
              (sum, t) => sum + Math.round(t.quantity * t.unitPrice * 100) / 100,
              0,
            ),
          }
        : 0,
      p.base_currency,
    ]);
    total.font = { bold: true };
    total.getCell(5).numFmt = `"${p.base_currency}" #,##0.00`;
    sheet.pageSetup.printTitlesRow = '1:7';
    const output = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(output),
      filename: `fintrack-${portfolioId}-transactions.xlsx`,
      count: rows.length,
    };
  }
}
