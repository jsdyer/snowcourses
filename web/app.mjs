import {byId as el, element, option, loadData,csvDownload} from "./shared.mjs";
import {comparison} from "./model.mjs";
let courses,visible=[];
function pLabel(key) {
  return new Intl.DateTimeFormat("en-CA",{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date("2000-"+key+"T12:00:00Z"));
}
function value(v,unit=""){return v==null?"No reading":v.toLocaleString("en-CA",{maximumFractionDigits:1})+unit;}
function stat(label,v){const p=element("p");p.append(element("strong",v),element("span",label));return p;}
function course(){return courses[el("station").value];}
function showStations() {
  const pool=Object.entries(courses).filter(([,s])=>s.mode===el("mode").value).sort((a,b)=>a[1].name.localeCompare(b[1].name));
  el("station").replaceChildren(...pool.map(([key,s])=>option(key,s.name+" · "+key)));
  const initial=el("mode").value==="Manual survey"?"3A01":"1A03P";
  if(courses[initial])el("station").value=initial;
  showPeriods();
}
function showPeriods(){
  const rows=course().readings, current=el("period").value;
  const periods=[...new Set(rows.map(r=>r[1]))].sort();
  el("period").replaceChildren(...periods.map(key=>option(key,pLabel(key))));
  el("period").value=course().mode==="Automated station"?rows[rows.length-1][1]:(periods.includes(current)?current:periods.includes("04-01")?"04-01":periods[0]);
  showYears();
}
function showYears(){
  const previous=el("year").value;
  const {years}=comparison(course().readings,el("period").value,9999,3);
  el("year").replaceChildren(...years.map(y=>option(String(y))));
  if(years.includes(Number(previous)))el("year").value=previous;
  render();
}
function render(){
  const station=course(),period=el("period").value,year=Number(el("year").value),idx=Number(el("metric").value);
  const {rows,selected,reference,n}=comparison(station.readings,period,year,idx);
  visible=[...rows].sort((a,b)=>b[0].localeCompare(a[0]));
  const unit=idx===3?" mm":" cm";
  el("scope").textContent=station.mode==="Manual survey"?
    "Official "+pLabel(period)+" survey period. Actual visit dates can vary. Flagged readings remain in the table and are excluded from the historical median.":
    "Readings at 16:00 UTC on "+pLabel(period)+". Snow depth is available from the current hourly file. The historical automated archive supplies water equivalent.";
  el("stats").replaceChildren(stat("Snow depth · "+selected[0],value(selected[2]," cm")),stat("Water equivalent · "+selected[0],value(selected[3]," mm")),
    stat("Earlier same-period median · "+n+" years",value(reference,unit)));
  const bars=visible.filter(r=>r[idx]!==null).slice(0,20).reverse();
  const max=Math.max(1,...bars.map(r=>r[idx]));
  const chart=el("chart");chart.replaceChildren();
  const title=element("p","Latest "+bars.length+" recorded values · "+(idx===3?"water equivalent (mm)":"snow depth (cm)"));
  const graph=element("div");graph.className="bars";
  for(const row of bars){const bar=element("div");bar.style.height=Math.max(2,Math.round(row[idx]/max*100))+"%";bar.title=row[0]+" · "+value(row[idx],unit)+(row[4]?" · "+row[4]:"");if(row===selected)bar.className="selected";graph.append(bar);}
  if(bars.length)chart.append(title,graph,element("small",bars[0][0]+" to "+bars.at(-1)[0]+". Exact observations appear below."));
  else chart.append(element("p","No numeric readings for this measurement."));
  el("summary").textContent=visible.length+" entries for "+station.name+" · "+pLabel(period)+(station.elevation?" · "+station.elevation+" m elevation":"");
  el("rows").replaceChildren(...visible.map(r=>{const tr=element("tr");tr.dataset.selected=String(r===selected);for(const x of [r[0],value(r[2]),value(r[3]),r[4]||"—"])tr.append(element("td",x));return tr;}));
}
try{
 const [status,records]=await loadData();courses=records;
 el("edition").textContent=status.manual+" manual courses · "+status.automated+" automated stations · latest observation "+status.latest+" · retrieved "+status.retrieved;
 el("mode").onchange=()=>{el("year").replaceChildren();el("period").replaceChildren();showStations()};
 el("station").onchange=showPeriods;el("period").onchange=showYears;el("year").onchange=render;el("metric").onchange=render;
 el("download").onclick=()=>csvDownload("snowcourses-"+el("station").value+"-"+el("period").value+".csv",[["Station","Date","Nominal period","Snow depth cm","Water equivalent mm","Survey flag"],...visible.map(r=>[el("station").value,...r])]);
 showStations();
}catch{el("edition").textContent="Unable to load the published observations. Try reloading or use the provincial source below.";}
