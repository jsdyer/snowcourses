export function median(values) {
  if (!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b), mid=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
}
export function comparison(readings,period,year,index) {
  const rows=readings.filter(r=>r[1]===period);
  const season=r=>Number(r[0].slice(0,4)) +
    (Number(period.slice(0,2))<=2 && Number(r[0].slice(5,7))===12 ? 1 : 0);
  const selected=rows.filter(r=>season(r)===year).sort((a,b)=>b[0].localeCompare(a[0]))[0];
  const groups=new Map();
  for(const row of rows) {
    const y=season(row);
    if(y>=year || row[4] || row[index]===null) continue;
    if(!groups.has(y)) groups.set(y,[]);
    groups.get(y).push(row[index]);
  }
  return {rows,selected,years:[...new Set(rows.map(season))].sort((a,b)=>b-a),
    reference:median([...groups.values()].map(median)),n:groups.size};
}

function seasonDay(period) {
  const year = period < '10-01' ? 2000 : 1999;
  return (Date.parse(year+'-'+period+'T00:00:00Z') - Date.UTC(1999,9,1)) / 86400000;
}

export function seasonSeries(readings, selectedPeriod, year, index) {
  const endYear = year + (selectedPeriod >= '10-01' ? 1 : 0);
  const periods = new Map();
  for (const row of readings) {
    const [date, period] = row;
    const nominal = Number(date.slice(0,4)) +
      (period <= '02-29' && date.slice(5,7) === '12' ? 1 : 0);
    const season = nominal + (period >= '10-01' ? 1 : 0);
    if (season > endYear) continue;
    if (!periods.has(period)) periods.set(period, {earlier:new Map(), selected:[]});
    const bucket = periods.get(period);
    if (season === endYear) { bucket.selected.push(row); continue; }
    if (!Number.isFinite(row[index]) || row[4]) continue;
    if (!bucket.earlier.has(season)) bucket.earlier.set(season,[]);
    bucket.earlier.get(season).push(row[index]);
  }
  const series = [...periods].map(([period, bucket]) => {
    const selected = bucket.selected.sort((a,b)=>b[0].localeCompare(a[0]))[0];
    const earlier = [...bucket.earlier.values()].map(median);
    return {period, day:seasonDay(period), value:selected?.[index] ?? null,
      observed:selected?.[0], flag:selected?.[4], typical:median(earlier), count:earlier.length};
  }).sort((a,b)=>a.day-b.day);
  return {endYear, series};
}
