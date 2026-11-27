import {validateCatalog, catalogRows, filterRows, feedbackLink, formatDate} from "./catalog.js?v=haiglavaade1";

const byId = id => document.getElementById(id);
const dialog = byId("detail"), list = byId("list"), query = byId("otsing");
const region = byId("region"), hospital = byId("hospital"), examples = byId("examples");
const statusLabels = {demo:"Näidiskirje", web:"Haigla veebileht", working:"Tööversioon", review:"Vajab ülevaatamist", confirmed:"Haigla kinnitatud"};
let data, rows = [], scopeRows = [], activeGroup = "";

function visibleRows() {
  return data.mode === "mixed" && !examples.checked ? rows.filter(row => row.route.status !== "demo") : rows;
}

function fillOptions(select, options, preferred) {
  select.length = 1;
  for (const [key, label] of [...options].sort((a, b) => a[1].localeCompare(b[1], "et"))) {
    select.add(new Option(label, key));
  }
  select.value = options.has(preferred) ? preferred : "";
}

function element(tag, className, content) {
  const el=document.createElement(tag);
  if (className) el.className=className;
  if (content !== undefined) el.textContent=content;
  return el;
}
function showDialog(kicker, title, nodes) {
  byId("dialog-kicker").textContent=kicker;
  byId("dialog-title").textContent=title;
  byId("dialog-body").replaceChildren(...nodes);
  dialog.showModal();
  dialog.querySelector(".close").focus();
}
dialog.querySelector(".close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("click",event=>{
  if(event.target !== dialog) return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom) dialog.close();
});
byId("about").addEventListener("click",()=>{
  const intro=element("p","", "Teenuseotsing koondab perearstile haiglate suunamistingimused ja broneerimisjuhised. Iga teenusevariandi juures näeb selle allikat ja viimase kontrolli kuupäeva.");
  const notes=[intro];
  if(data?.mode==="demo") notes.push(element("p","","Arenduseelvaates on väljamõeldud haiglad ja näidiskirjed. Siin saab proovida otsingut, võrrelda suunamisteid ja avada paranduse saatmiseks e-kirja mustandi."));
  if(data?.mode==="mixed") notes.push(element("p","","Vaikimisi näed päris haiglate teenuseid. Veebiallikaga kirje viitab haigla avalikule juhisele. Tööversiooni kirjes pärineb suunamisviis haigla saadetud ülevaatest ja vajab haigla lõplikku kinnitust. Näidiskirjed saab soovi korral filtrite all sisse lülitada."));
  showDialog("NOPE","Andmetest",notes);
});
function details(row) {
  const {route:r,hospital:h,service:s}=row;
  const info=element("dl");
  const add=(label,value)=>{
    const dd=element("dd");
    if(typeof value==="string") dd.textContent=value; else dd.append(value);
    info.append(element("dt","",label),dd);
  };
  add("Haigla ja asukoht",h.name + " · " + h.location + " · " + r.location);
  add("Suunamisviis",r.referral);
  add("Suunamise tingimused",r.conditions);
  add("Broneerimine",r.booking);
  if(r.sourceUrl){
    const anchor=element("a","",r.source);anchor.href=r.sourceUrl;anchor.target="_blank";anchor.rel="noopener noreferrer";add("Allikas",anchor);
  } else add("Allikas",r.source);
  add("Andmete päritolu",statusLabels[r.status]);
  if(r.sourceNote) add("Suunamisjuhise allikas",r.sourceNote);
  add(r.status==="demo"?"Näidiskirje kuupäev":"Allikas üle vaadatud",formatDate(r.checked));
  const link=element("a","action-link","Teata muudatusest");link.href=feedbackLink(row,data.feedbackEmail);
  const content=[element("p","minor",r.variant),info,link];
  if(!data.feedbackEmail) content.push(element("p","dialog-note","Link avab e-kirja mustandi. Saaja saad lisada oma meiliprogrammis."));
  showDialog(s.group,s.name,content);
}
function link(label, href) {
  const anchor = element("a", "", label);
  anchor.href = href;
  return anchor;
}

function telephone(number) {
  const local = number.startsWith("+372") ? number.slice(4) : number;
  const display = local.length === 7 ? local.slice(0,3) + " " + local.slice(3) : local;
  return link(display, "tel:" + number);
}

function contactBlock(contact) {
  const item = element("div","contact");
  const heading = element("div","contact-label",contact.label);
  const phone = telephone(contact.phone);
  phone.className = "phone";
  item.append(heading, phone);
  if (contact.hours) item.append(element("span","hours",contact.hours));
  if (contact.email) item.append(link(contact.email, "mailto:" + contact.email));
  return item;
}

function showContacts(h) {
  const panel = byId("contacts");
  panel.replaceChildren();
  panel.hidden = !h || !(h.contacts?.length || h.website);
  byId("workspace").classList.toggle("has-contacts", !panel.hidden);
  if (panel.hidden) return;
  panel.append(element("h2","panel-title","Põhikontaktid"));
  if (h.contacts?.length) {
    panel.append(contactBlock(h.contacts[0]));
    if (h.contacts.length > 1) {
      const other = element("details","more-contacts");
      other.open = window.matchMedia("(min-width: 850px)").matches;
      other.append(element("summary","","Teised kontaktid"));
      other.append(...h.contacts.slice(1).map(contactBlock));
      panel.append(other);
    }
  }
  const sources = element("div","contact-sources");
  for (const source of h.contactSources ?? []) sources.append(link(source.label,source.url));
  if (h.website) sources.append(link("Haigla koduleht",h.website));
  if (h.contactsChecked) sources.append(element("span","checked","Kontaktid kontrollitud " + formatDate(h.contactsChecked)));
  panel.append(sources);
}

function showOverview(h) {
  const location = h ? [h.region, h.county].filter(Boolean).join(" / ") : region.value;
  byId("scope-place").textContent = location;
  byId("scope-place").hidden = !location;
  byId("scope-title").textContent = h?.name ?? (region.value ? "Piirkonna haiglad" : "Kõik haiglad");
  byId("scope-address").textContent = h?.address ?? h?.location ?? "";
  byId("scope-address").hidden = !h;
  const metrics = byId("metrics");
  metrics.replaceChildren();
  const measures = [
    [new Set(scopeRows.map(row => row.service.id)).size, "teenus", "teenust"],
    [scopeRows.length, "suunamisvariant", "suunamisvarianti"],
    [new Set(scopeRows.map(row => row.service.group)).size, "teenusegrupp", "teenusegruppi"]
  ];
  for (const [value, singular, plural] of measures) {
    const block = element("div");
    block.append(element("dt","",value === 1 ? singular : plural),element("dd","",String(value)));
    metrics.append(block);
  }
  const index = byId("service-index");
  index.replaceChildren();
  index.hidden = !h || !scopeRows.length;
  if (!index.hidden) {
    index.append(element("strong","","Teenused kataloogis"));
    const services = new Map(scopeRows.map(row => [row.service.id,row.service.name]));
    const links = element("div","service-links");
    for (const name of services.values()) {
      const button = element("button","index-service",name);
      button.type = "button";
      button.addEventListener("click",() => {
        query.value = name;
        activeGroup = "";
        showResults();
        byId("result-heading").focus();
      });
      links.append(button);
    }
    index.append(links);
  }
  byId("overview").hidden = false;
  showContacts(h);
}

function syncScope({chooseOnly = false, preferred = hospital.value} = {}) {
  const visible = visibleRows();
  const regions = visible.map(row => row.hospital.region).filter(Boolean);
  fillOptions(region, new Map(regions.map(name => [name,name])), region.value);
  const regional = visible.filter(row => !region.value || row.hospital.region === region.value);
  const hospitals = new Map(regional.map(row => [row.hospital.id,row.hospital.name]));
  if (chooseOnly && hospitals.size === 1 && !hospitals.has(preferred)) preferred = hospitals.keys().next().value;
  fillOptions(hospital,hospitals,preferred);
  scopeRows = regional.filter(row => !hospital.value || row.hospital.id === hospital.value);
  const groups = [...new Set(scopeRows.map(row => row.service.group))];
  if (!groups.includes(activeGroup)) activeGroup = "";
  const bar = byId("groups");
  bar.replaceChildren();
  for (const name of ["", ...groups.sort((a,b) => a.localeCompare(b,"et"))]) {
    const choice = element("button","group-button",name || "Kõik teenused");
    choice.type = "button";
    choice.dataset.group = name;
    bar.append(choice);
  }
  const h = data.hospitals.find(item => item.id === hospital.value);
  showOverview(h);
  showResults();
}

function makeRow(row) {
  const {route, hospital:h, service} = row;
  const tr = element("tr");
  const title = element("th","service-cell");
  title.scope = "row";
  title.append(element("span","service-name",service.name),element("span","variant",route.variant));
  if (!hospital.value) {
    const choose = element("button","choose-hospital",h.name);
    choose.type = "button";
    choose.addEventListener("click",() => {
      syncScope({preferred:h.id});
      saveScope();
      hospital.focus();
    });
    title.append(choose);
  }
  const method = element("td","method",route.referral);
  const provenance = element("td","origin");
  provenance.append(element("span","status " + route.status,statusLabels[route.status]));
  const action = element("td","action");
  const button = element("button","open-row","Juhis");
  button.type = "button";
  button.setAttribute("aria-label","Vaata juhist: " + [service.name,route.variant,h.name].join(", "));
  button.addEventListener("click",() => details(row));
  action.append(button);
  tr.append(title,method,provenance,action);
  return tr;
}

function showResults() {
  if (!data) return;
  const matches = filterRows(scopeRows,{query:query.value,group:activeGroup});
  for (const button of byId("groups").children) {
    button.setAttribute("aria-pressed",String(button.dataset.group === activeGroup));
  }
  byId("count").textContent = matches.length + (matches.length === 1 ? " kirje" : " kirjet");
  byId("clear").hidden = !(region.value || hospital.value || activeGroup || query.value || examples.checked);
  const note = byId("demo");
  const messages = [];
  if (matches.some(row => row.route.status === "working")) messages.push("Tööversiooniga suunamisjuhised ootavad haigla kinnitust.");
  if (matches.some(row => row.route.status === "demo")) messages.push("Näidishaiglate andmed on väljamõeldud.");
  note.textContent = messages.join(" ");
  note.hidden = !messages.length;
  if (!matches.length) {
    list.replaceChildren(element("p","state","Ühtegi suunamisjuhist ei leitud. Muuda otsingut või lähtesta filtrid."));
    return;
  }
  const table = element("table","routes");
  table.setAttribute("aria-label","Suunamisjuhised");
  const head = table.createTHead().insertRow();
  for (const label of ["Teenus ja variant","Suunamisviis","Andmete päritolu","Juhis"]) {
    const th = element("th","",label);
    th.scope = "col";
    head.append(th);
  }
  const grouped = new Map();
  for (const row of matches) {
    const name = row.service.group;
    if (!grouped.has(name)) grouped.set(name,[]);
    grouped.get(name).push(row);
  }
  for (const [name,items] of grouped) {
    const body = table.createTBody();
    const heading = element("th","row-group",name);
    heading.scope = "rowgroup";
    heading.colSpan = 4;
    body.insertRow().append(heading);
    body.append(...items.map(makeRow));
  }
  list.replaceChildren(table);
}

function saveScope() {
  const url = new URL(location.href);
  url.searchParams.set("haigla",hospital.value);
  for (const [key,value] of [["piirkond",region.value],["naidised",examples.checked ? "1" : ""]]) {
    if (value) url.searchParams.set(key,value); else url.searchParams.delete(key);
  }
  history.replaceState(null,"",url);
}

byId("filters").addEventListener("submit",event => event.preventDefault());
query.addEventListener("input",showResults);
region.addEventListener("change",() => { syncScope({chooseOnly:true}); saveScope(); });
hospital.addEventListener("change",() => { syncScope(); saveScope(); });
examples.addEventListener("change",() => {
  if (examples.checked) region.value = "";
  syncScope({chooseOnly:!examples.checked,preferred:""});
  saveScope();
});
byId("groups").addEventListener("click",event => {
  const button = event.target.closest("button[data-group]");
  if (button) { activeGroup = button.dataset.group; showResults(); }
});
byId("clear").addEventListener("click",() => {
  byId("filters").reset();
  activeGroup = "";
  syncScope({preferred:""});
  saveScope();
  query.focus();
});

try {
  const response = await fetch("./data/catalog.json",{cache:"no-cache"});
  if (!response.ok) throw Error("Andmete laadimine ebaõnnestus.");
  data = validateCatalog(await response.json());
  rows = catalogRows(data);
  byId("examples-label").hidden = data.mode !== "mixed";
  const params = new URL(location.href).searchParams;
  examples.checked = data.mode === "mixed" && params.get("naidised") === "1";
  const initialRegions = visibleRows().map(row => row.hospital.region).filter(Boolean);
  fillOptions(region,new Map(initialRegions.map(name => [name,name])),params.get("piirkond"));
  syncScope({chooseOnly:!params.has("haigla"),preferred:params.get("haigla")});
} catch (error) {
  list.replaceChildren(element("p","state","Teenuseinfot ei õnnestunud laadida. Värskenda lehte või proovi hiljem uuesti."));
  console.error(error.message);
}
