const textFields = (item, fields) => fields.every(key => typeof item?.[key] === "string" && item[key].trim());
const httpsLink = value => {
  try { const link = new URL(value); return link.protocol === "https:" && !link.username && !link.password; }
  catch { return false; }
};
export function validateCatalog(data) {
  if (!data || !["demo", "live", "mixed"].includes(data.mode)) throw Error("Tundmatu andmestiku režiim.");
  if (typeof data.feedbackEmail !== "string" || (data.feedbackEmail && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(data.feedbackEmail))) throw Error("Vigane paranduste e-posti aadress.");
  const seen = {};
  for (const table of ["hospitals","services","routes"]) {
    if (!Array.isArray(data[table])) throw Error("Loend puudub: " + table);
    seen[table] = new Set();
    for (const item of data[table]) {
      if (!textFields(item,["id"]) || !/^[a-z0-9][a-z0-9-]*$/.test(item.id) || seen[table].has(item.id)) throw Error("Vigane või korduv ID loendis " + table + ": " + item?.id);
      seen[table].add(item.id);
    }
  }
  for (const h of data.hospitals) {
    for (const field of ["region","county","address"]) {
      if (h[field] !== undefined && !textFields(h,[field])) throw Error("Kontrolli haigla andmeid: " + h.id);
    }
    if (h.contacts !== undefined) {
      if (!Array.isArray(h.contacts) || !h.contacts.every(c => textFields(c,["label","phone"]) && /^\+[1-9]\d{6,14}$/.test(c.phone) && (!c.email || /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(c.email)))) throw Error("Kontrolli haigla kontakte: " + h.id);
      if (!Array.isArray(h.contactSources) || !h.contactSources.length || !h.contactSources.every(s => textFields(s,["label"]) && httpsLink(s.url))) throw Error("Haigla kontaktiallika link puudub: " + h.id);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(h.contactsChecked) || !Number.isFinite(Date.parse(h.contactsChecked+"T00:00:00Z")) || new Date(h.contactsChecked+"T00:00:00Z").toISOString().slice(0,10)!==h.contactsChecked) throw Error("Kontrolli kontaktide kuupäeva: " + h.id);
    }
    if (!textFields(h,["name","location"]) || (h.website !== null && !httpsLink(h.website))) throw Error("Kontrolli haiglat " + h.id);
  }
  for (const s of data.services) {
    if (!textFields(s,["name","group"]) || !Array.isArray(s.aliases) || !s.aliases.every(a=>typeof a === "string" && a.trim())) throw Error("Kontrolli teenust " + s.id);
  }
  for (const r of data.routes) {
    if (!textFields(r,["hospitalId","serviceId","variant","referral","location","conditions","booking","source","checked","status"])) throw Error("Kirjes puudub kohustuslik väli: " + r.id);
    if (!seen.hospitals.has(r.hospitalId) || !seen.services.has(r.serviceId)) throw Error("Tundmatu haigla või teenus: " + r.id);
    const timestamp = Date.parse(r.checked + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0,10) !== r.checked) throw Error("Vigane kuupäev: " + r.id);
    const realStatuses = ["confirmed","review","web","working"];
    const statuses = data.mode === "demo" ? ["demo"] : data.mode === "mixed" ? [...realStatuses,"demo"] : realStatuses;
    if (["web","working"].includes(r.status) && !httpsLink(r.sourceUrl)) throw Error("Avaliku allika link puudub: " + r.id);
    if (r.status === "working" && !textFields(r,["sourceNote"])) throw Error("Tööversiooni selgitus puudub: " + r.id);
    if (!statuses.includes(r.status) || (r.sourceUrl !== null && !httpsLink(r.sourceUrl))) throw Error("Kontrolli olekut või allikat: " + r.id);
  }
  return data;
}
function normalize(value) {
  return value.toLocaleLowerCase("et").normalize("NFD").replace(/\p{M}/gu,"").replace(/[-–]/g," ").trim();
}
export function catalogRows(data) {
  const hospitals = new Map(data.hospitals.map(h=>[h.id,h]));
  const services = new Map(data.services.map(s=>[s.id,s]));
  return data.routes.map(route=>{
    const hospital=hospitals.get(route.hospitalId), service=services.get(route.serviceId);
    const search=normalize([service.name, ...service.aliases, hospital.name, hospital.location, hospital.region, hospital.county, service.group, route.variant, route.referral, route.location].join(" "));
    return {route,hospital,service,search};
  });
}
export function filterRows(rows, {query="",hospital="",group=""}={}) {
  const words=normalize(query).split(/\s+/).filter(Boolean);
  return rows.filter(row=>(!hospital || row.hospital.id === hospital) && (!group || row.service.group === group) && words.every(word=>word.length<=2 ? row.search.split(/\s+/).some(token=>token.startsWith(word)) : row.search.includes(word)));
}
export function feedbackLink(row,email) {
  const subject="NOPE teenuseinfo muudatus · " + row.route.id + " · " + row.service.name;
  const body=[row.hospital.name,row.service.name + " · " + row.route.variant,"Kirje ID: " + row.route.id,"","Palun muuta: ","","Info allikas: "].join("\n");
  return "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}
export const formatDate = iso => iso.split("-").reverse().join(".");

