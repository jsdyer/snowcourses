import test from "node:test";
import assert from "node:assert/strict";
import {comparison,median} from "../web/model.mjs";
test("same surveyed period compares eligible prior years and preserves zeros",()=>{
 const a=[["2023-03-30","04-01",12,0,""],["2024-04-01","04-01",35,28,"PROBLEM"],["2025-03-29","04-01",40,20,""],["2026-04-02","04-01",null,7,""]];
 const b=comparison(a,"04-01",2026,3);
 assert.equal(b.reference,10);assert.equal(b.n,2);assert.equal(b.selected[2],null);assert.equal(median([]),null);
});
test("a January survey conducted in December belongs to the following January",()=>{
 const rows=[["2025-12-30","01-01",30,99,""]];assert.equal(comparison(rows,"01-01",2026,3).selected[3],99);
});

import {seasonSeries} from '../web/model.mjs';
test('nominal January visits in December belong to the upcoming winter and prior flags are excluded', () => {
  const rows=[['2023-12-29','01-01',1,10,''],['2024-01-01','01-01',3,30,''],
    ['2024-12-31','01-01',5,50,'X'],['2025-12-30','01-01',7,70,'']];
  const winter=seasonSeries(rows,'01-01',2026,3);
  assert.equal(winter.endYear,2026);
  assert.equal(winter.series[0].value,70);
  assert.equal(winter.series[0].typical,20);
  assert.equal(winter.series[0].count,1);
});
