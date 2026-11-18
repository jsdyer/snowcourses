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
