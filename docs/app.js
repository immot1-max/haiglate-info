import {validateCatalog,catalogRows,filterRows,feedbackLink,formatDate} from "./catalog.js";
const byId = id => document.getElementById(id);
const dialog=byId("detail"), list=byId("list"), query=byId("otsing"), hospital=byId("hospital"), group=byId("group");
let data, rows=[];
const examples=byId("examples");
const statusLabels={demo:"Näidiskirje",web:"Haigla veebiallikas",working:"Tööversiooni juhis",review:"Vajab ülevaatamist",confirmed:"Haigla kinnitatud"};
function visibleRows(){
  return data.mode==="mixed" && !examples.checked ? rows.filter(row=>row.route.status!=="demo") : rows;
}
function rebuildFilters(){
  const available=visibleRows();
  const fill=(select,options)=>{
    const previous=select.value;
    select.length=1;
    for(const [key,label] of [...options].sort((a,b)=>a[1].localeCompare(b[1],"et"))) select.add(new Option(label,key));
    if(options.has(previous)) select.value=previous;
  };
  fill(hospital,new Map(available.map(row=>[row.hospital.id,row.hospital.name])));
  fill(group,new Map(available.map(row=>[row.service.group,row.service.group])));
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
const groupIcons=new Map([["Endoskoopia",["endo","∿"]],["Diagnostika",["diag","◎"]],["Taastusravi",["rehab","≋"]]]);
function makeRow(row) {
  const {route:r,hospital:h,service:s}=row;
  const article=element("article","route-row");
  const service=element("div","service-cell"), icon=groupIcons.get(s.group) || ["other","+"], tile=element("span","service-icon "+icon[0]);
  tile.setAttribute("aria-hidden","true");tile.append(element("span","",icon[1]));
  const label=element("div");label.append(element("span","route-name",s.name),element("span","minor",r.variant));service.append(tile,label);
  const org=element("div","hospital-cell");org.append(element("span","hospital-name",h.name),element("span","minor",r.location));
  const type=element("div","type-cell");type.append(element("span","tag"+(r.referral==="E-konsultatsioon"?" consult":""),r.referral));
  type.append(element("span","provenance "+r.status,statusLabels[r.status]));
  const button=element("button","open-row","Vaata juhist");button.type="button";button.setAttribute("aria-label","Vaata juhist: "+s.name+", "+r.variant+", "+h.name);button.addEventListener("click",()=>details(row));
  article.append(service,org,type,button);return article;
}
function showResults() {
  if(!data) return;
  const active={query:query.value,hospital:hospital.value,group:group.value};
  const matches=filterRows(visibleRows(),active);
  byId("count").textContent=matches.length+" "+(matches.length===1?"kirje":"kirjet");
  byId("clear").hidden=!(active.query || active.hospital || active.group || examples.checked);
  list.replaceChildren(...matches.map(makeRow));
  if(!matches.length) list.append(element("p","state","Selle otsinguga kirjeid ei leitud."));
}
byId("filters").addEventListener("submit",e=>e.preventDefault());
query.addEventListener("input",showResults);hospital.addEventListener("change",showResults);group.addEventListener("change",showResults);
byId("clear").addEventListener("click",()=>{byId("filters").reset();rebuildFilters();showResults();query.focus();});
examples.addEventListener("change",()=>{rebuildFilters();showResults();});
try {
  const res=await fetch("./data/catalog.json");
  if(!res.ok) throw Error("Laadimine ebaõnnestus.");
  data=validateCatalog(await res.json());
  rows=catalogRows(data);
  byId("examples-label").hidden=data.mode!=="mixed";
  byId("demo").hidden=data.mode==="live";
  byId("data-notice").textContent=data.mode==="mixed" ? "Tööversiooni märge tähistab haigla lõplikku kinnitust ootavat suunamisjuhist." : "Näidisandmed · Haiglad ja suunamisjuhised on väljamõeldud.";
  rebuildFilters();
  showResults();
} catch(error) {
  list.replaceChildren(element("p","state","Teenuseinfot ei õnnestunud laadida. Värskenda lehte või proovi hiljem uuesti."));
  console.error(error.message);
}

