import {byId, element} from './shared.mjs';
import {seasonSeries} from './model.mjs';

const NS = 'http://www.w3.org/2000/svg';
function mark(tag, attrs, content) {
  const n=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
  if(content!=null)n.textContent=content;
  return n;
}
const format = v=>v.toLocaleString('en-CA',{maximumFractionDigits:1});

export function renderSeason(station,period,year,index) {
  const {endYear,series}=seasonSeries(station.readings,period,year,index);
  const unit=index===3?'mm':'cm', metric=index===3?'Water equivalent':'Snow depth';
  const root=byId('season-plot');
  const width=Math.max(300,Math.min(890,root.clientWidth || 700));
  const lo=49,hi=width-12,top=20,bottom=207;
  const max=Math.max(1,...series.flatMap(p=>[p.value??0,p.typical??0]));
  const x=day=>lo+day/365*(hi-lo), y=v=>bottom-v/max*(bottom-top);
  const svg=mark('svg',{viewBox:'0 0 '+width+' 244',role:'img',
    'aria-label':metric+' for '+(endYear-1)+'–'+endYear+' and earlier seasonal medians. See the season table for exact readings.'});
  for(let i=0;i<=4;i++){
    const v=max*i/4;
    svg.append(mark('line',{x1:lo,x2:hi,y1:y(v),y2:y(v),stroke:'#d6e0e0'}),
      mark('text',{x:lo-5,y:y(v)+4,'text-anchor':'end'},format(v)));
  }
  for(const [d,label] of [[0,'Oct'],[92,'Jan'],[183,'Apr'],[274,'Jul'],[365,'Sep']]){
    svg.append(mark('text',{x:x(d),y:229,'text-anchor':d===0?'start':d===365?'end':'middle'},label));
  }
  const daily=station.mode==='Automated station';
  for(const [field,color] of [['typical','#79715c'],['value','#006386']]){
    let path='', previous=null;const dots=[];
    for(const p of series){
      const v=p[field];
      if(v===null){previous=null;continue;}
      const join=previous!==null && p.day-previous<=(daily?1:45);
      path+=(join?'L':'M')+x(p.day)+' '+y(v)+' ';previous=p.day;
      const chosen=p.period===period && field==='value';
      const dot=mark('circle',{cx:x(p.day),cy:y(v),r:chosen?5:daily?1.3:3.7,fill:color,stroke:chosen?'white':'none'});
      dot.append(mark('title',{},p.period+' · '+(field==='typical'?'Prior median':p.observed)+' · '+format(v)+' '+unit));dots.push(dot);
    }
    svg.append(mark('path',{d:path,fill:'none',stroke:color,'stroke-width':field==='typical'?2:2.7,'stroke-dasharray':field==='typical'?'5 4':'none'}),...dots);
  }
  byId('season-name').textContent=station.name+' · '+(endYear-1)+'–'+endYear;
  byId('season-measure').textContent=metric+' ('+unit+')';
  const chosen=series.find(p=>p.period===period);
  const delta=chosen?.value!=null && chosen.typical!=null ? chosen.value-chosen.typical : null;
  byId('departure').textContent=delta===null?'A departure requires a measured value and an earlier comparison.':
    'On '+chosen.observed+', '+metric.toLowerCase()+' was '+(delta===0?'equal to':format(Math.abs(delta))+' '+unit+' '+(delta>0?'above':'below'))+
    ' the median for this period across '+chosen.count+' earlier winters.'+(chosen.flag?' Source flag: '+chosen.flag+'.':'');
  root.replaceChildren(svg);
  const table=byId('season-body');table.replaceChildren();
  for(const p of series) {
    const tr=element('tr');
    for(const v of [p.period,p.observed??'—',p.value===null?'—':format(p.value),p.typical===null?'—':format(p.typical),p.count,p.flag||'—'])tr.append(element('td',v));
    table.append(tr);
  }
}
