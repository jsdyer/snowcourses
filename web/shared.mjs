export const byId = id => document.getElementById(id);
export function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
export function option(value, label=value) { return new Option(label,value); }
export async function loadData() {
  const [status,record] = await Promise.all(["./status.json","./records.json.gz"].map(path => fetch(path)));
  if (!status.ok || !record.ok) throw Error("Snapshot unavailable");
  const bytes = new Uint8Array(await record.arrayBuffer());
  const body = bytes[0] === 31 && bytes[1] === 139 ? new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")) : bytes;
  return [await status.json(), await new Response(body).json()];
}
export function csvDownload(name, rows) {
  const field = value => {
    let s = String(value ?? "");
    if (/^[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"','""') + '"';
  };
  const text=rows.map(row => row.map(field).join(",")).join("\r\n");
  const anchor=element("a"); anchor.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
  anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
}
