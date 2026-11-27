# NOPE haiglate teenuseotsing

Eestikeelne staatiline veebileht haiglate teenuste ja suunamisviiside otsimiseks. Vaikimisi on nähtavad Põlva haigla päris teenused. Endoskoopia suunamisviisid on märgitud haigla novembri tööversioonist pärinevaks. Otsingu võrdlemiseks saab juurde kuvada kaks väljamõeldud näidishaiglat.

## Muuda teenuseinfot

Veebifailid asuvad selles projektis kaustas `dist` või GitHubi stardipakis kaustas `docs`. Ava selle kausta fail `data/catalog.json`. Lisa uus haigla loendisse `hospitals` ning vähemalt üks tema teenusevariant loendisse `routes`. Üldine teenus pärineb loendist `services`. Kirjed seotakse püsivate IDdega. Iga lisatud rida ilmub automaatselt otsingusse ja filtritesse.

Sünonüümid, näiteks UH, käivad teenuse väljale `aliases`. Iga suunamistee juurde märgi lühikesed tingimused, broneerimisjuhis, allikas ja kuupäev kujul AAAA-KK-PP. Veebiaadressi puudumisel kasuta väärtust `null`. Näidisandmete puhul on `mode` ja iga rea `status` väärtuseks `demo`. Režiimis `mixed` saab näidiskirjed eraldi sisse lülitada. `web` tähistab haigla veebiallikat, `working` tööversiooni koos viite ja selgitusega, `confirmed` haigla kinnitust ning `review` ülevaatust vajavat infot. Režiimis `live` kuvatakse pärisandmed. Staatilisse andmefaili võib panna ainult avaldamiseks sobivat sisu.

Paranduse link avab e-kirja mustandi teenuse ID ja nimetusega. Määra kinnitatud toimetaja aadress väljale `feedbackEmail`. Tühi väärtus jätab saaja kasutaja valida.

## Proovi kohapeal

Käivita projekti juurkaustas `node scripts/check.mjs` (Node 20 või uuem). Kontroll hõlmab ka uue haigla lisamist andmete kaudu. Seejärel käivita `python -m http.server 8080 --directory docs` või `dist`-kausta puhul `python -m http.server 8080 --directory dist`. Ava brauseris `http://localhost:8080`. Päringuga laaditav JSON vajab HTTP-serverit.

## GitHub Pages

Veeb asub kaustas `docs`. Pärast muudatuste ühendamist põhiharusse saab hoidla haldaja valida **Settings → Pages → Deploy from a branch**, haru `main` ja kausta `/docs`. GitHub kuvab valminud saidi aadressi samas seadete vaates. NOPE domeenil kasutamiseks saab veebihaldur lisada sobiva alamdomeeni.

[GitHub Pagesi seadistus](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
