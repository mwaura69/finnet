import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../src/domain/holdings.js';
import type { LedgerTransaction } from '../src/types.js';
const tx=(type:'BUY'|'SELL',quantity:number,unitPrice:number,tradeDate:string):LedgerTransaction=>({id:tradeDate,type,quantity,unitPrice,tradeDate,createdAt:tradeDate+'T00:00:00Z',instrument:'SCOM'});
test('moving-average basis, partial sales, realized gain and latest-trade valuation',()=>{
 const summary=summarize([tx('SELL',5,40,'2026-03-01'),tx('BUY',10,20,'2026-01-01'),tx('BUY',10,30,'2026-02-01')]);
 assert.equal(summary.holdings[0].netQuantity,15);assert.equal(summary.holdings[0].averageCost,25);assert.equal(summary.totalInvested,375);assert.equal(summary.totalValue,600);assert.equal(summary.realizedGain,75);assert.equal(summary.unrealizedGain,225);
});
test('backdated oversell is rejected even when later buys cover it',()=>{assert.throws(()=>summarize([tx('BUY',10,20,'2026-03-01'),tx('SELL',5,30,'2026-02-01')]),/Cannot sell/);});
test('closed positions have no residual basis and can reopen',()=>{const result=summarize([tx('BUY',3,10,'2026-01-01'),tx('SELL',3,11,'2026-02-01'),tx('BUY',1,15,'2026-03-01')]);assert.equal(result.totalInvested,15);assert.equal(result.realizedGain,3);assert.equal(result.holdings[0].averageCost,15);});
