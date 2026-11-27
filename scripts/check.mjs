import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const site=new URL(existsSync(new URL("../dist/catalog.js", import.meta.url)) ? "../dist/" : "../docs/",import.meta.url);
const {validateCatalog,catalogRows,filterRows,feedbackLink}=await import(new URL("catalog.js",site).href);
const data=JSON.parse(readFileSync(new URL("data/catalog.json",site),"utf8"));
validateCatalog(data);
const rows=catalogRows(data);
assert.equal(filterRows(rows).length,data.routes.length);
if(data.routes.length) {
  const first=rows[0];
  assert.ok(filterRows(rows,{query:first.service.name,hospital:first.hospital.id,group:first.service.group}).includes(first));
  assert.match(decodeURIComponent(feedbackLink(first,data.feedbackEmail)),new RegExp(first.route.id));
  const added=structuredClone(data);
  const id="test-kolmas-haigla";
  added.hospitals.push({id,name:"Andmefaili katsehaigla",location:"Näidislinn",website:null});
  added.routes.push({...first.route,id:"test-uus-suunamistee",hospitalId:id});
  assert.equal(filterRows(catalogRows(validateCatalog(added)),{hospital:id}).length,1);
  const broken=structuredClone(data);broken.routes[0].hospitalId="puuduv-haigla";
  assert.throws(()=>validateCatalog(broken),/Tundmatu/);
  const duplicate=structuredClone(data);duplicate.routes.push(duplicate.routes[0]);
  assert.throws(()=>validateCatalog(duplicate),/korduv/);
}
if( data.services.some(s=>s.id==="ultraheli" && s.aliases.includes("UH"))) {
  assert.ok(filterRows(rows,{query:"UH"}).some(r=>r.service.id==="ultraheli"));
}
assert.ok(!filterRows(rows,{query:"UH"}).some(r=>r.service.id==="psuhholoog"));
assert.equal(filterRows(rows,{query:"zzzz-qzk-000"}).length,0);
console.log("Andmestik ja otsing korras. Haiglaid: "+data.hospitals.length+", suunamisteid: "+rows.length+".");

