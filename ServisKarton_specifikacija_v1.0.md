# ServisKarton — Funkcionalna i tehnička specifikacija proizvoda

| | |
|---|---|
| **Radni naziv proizvoda** | ServisKarton (naziv je privremen; može se promeniti bez uticaja na specifikaciju) |
| **Verzija dokumenta** | 1.0 |
| **Datum** | 28. oktobar 2026. |
| **Status** | Spremno za predaju razvojnom timu |
| **Zamenjuje** | Brief v0.1 „Aplikacija za evidenciju auto-servisa“ |
| **Namena** | Kompletna specifikacija celog proizvoda (ne samo MVP-a): poslovni kontekst, analiza tržišta, funkcionalni zahtevi, model podataka, arhitektura, frontend, nefunkcionalni zahtevi, plan isporuke |
| **Publika** | Programeri (full-stack, frontend, backend), dizajner, QA, vlasnik proizvoda |

---

## 0. Kako čitati ovaj dokument

### 0.1. Struktura

| Deo | Sadržaj | Ko čita |
|---|---|---|
| 1–5 | Vizija, tržište, korisnici, poslovni model, rečnik | Svi |
| 6 | Korisnički tokovi od početka do kraja | Svi, posebno dizajner i QA |
| 7 | Funkcionalni zahtevi po modulima, sa ID-jevima i kriterijumima prihvatanja | Programeri, QA |
| 8 | Model podataka (PostgreSQL DDL, enumi, RLS) | Backend |
| 9 | Arhitektura, API, integracije, bezbednost | Backend, DevOps |
| 10 | Frontend: navigacija, ekrani, komponente, forme, offline | Frontend, dizajner |
| 11–13 | Nefunkcionalni zahtevi, privatnost, testiranje | Svi |
| 14–15 | Plan isporuke po fazama, rizici i odluke | Vlasnik proizvoda, tim lead |
| Prilozi | Primeri API poruka, šabloni poruka, checkliste | Po potrebi |

### 0.2. Konvencije

- **Nivoi obaveznosti** (po RFC 2119): **MORA** (obavezno), **TREBA** (podrazumevano, odstupanje se obrazlaže), **MOŽE** (opciono).
- **ID zahteva:** `FR-<MODUL>-<broj>` za funkcionalne (npr. `FR-ORD-004`), `NFR-<broj>` za nefunkcionalne. ID se ne menja ni kad se zahtev obriše (obeležava se kao povučen).
- **Prioritet / faza isporuke:** `P0` = MVP (Faza 1–2), `P1` = Verzija 1.0 (Faza 3–4), `P2` = Verzija 2.0 (Faza 5+). Mapiranje faza je u delu 14.
- **Kriterijumi prihvatanja (KP):** svaki zahtev nivoa MORA ima bar jedan proverljiv kriterijum. Pišu se u obliku „Dato… kada… onda…“ gde je smisleno.
- **Jezik:** dokument je na srpskom (latinica). Identifikatori u kodu, bazi i API-ju su na engleskom. Nazivi u korisničkom interfejsu su na srpskom, uz podršku za druge jezike (deo 10.6).
- **Novac:** svi iznosi se čuvaju kao celi brojevi u najmanjoj jedinici valute (para) ili kao `NUMERIC(14,2)`; nikad kao `FLOAT`. Odluka je u delu 8.
- **Vreme:** sve vremenske oznake u bazi su `TIMESTAMPTZ` u UTC-u; prikaz je u vremenskoj zoni servisa (podrazumevano `Europe/Belgrade`).

### 0.3. Šta ovaj dokument nije

- Nije dizajn-sistem sa gotovim ekranima (opisuje ekrane, ne crta ih).
- Nije pravni savet. Delovi o fiskalizaciji, SEF-u i ZZPL-u opisuju tehničke zahteve koje razvoj mora da podrži; pre produkcije ih potvrđuje knjigovođa / pravnik servisa.
- Nije procena troškova ni rokova u danima. Faze su date po sadržaju i redosledu zavisnosti.

---

## 1. Rezime proizvoda i vizija

### 1.1. Jednom rečenicom

ServisKarton je web aplikacija (desktop + mobilni browser, PWA) koja auto-servisu daje kompletnu digitalnu evidenciju klijenata, vozila, servisnih naloga, delova, finansija i dokumentacije, a svakom vozilu digitalni servisni karton koji servis može bezbedno da podeli sa klijentom putem linka.

### 1.2. Problem

Podaci servisa su rasuti po sveskama, Excel tabelama, Viber/WhatsApp porukama, fotografijama na telefonu mehaničara i fasciklama sa računima. Posledice: spor prijem vozila, nemogućnost da se brzo odgovori „šta je rađeno prošli put“, zaboravljena dugovanja, izgubljene fotografije kao dokazi, nulta vidljivost klijenta u to šta je i zašto urađeno, i nemogućnost da vlasnik servisa vidi stvarnu profitabilnost.

### 1.3. Rešenje

Jedna aplikacija koja prati ceo životni ciklus servisne intervencije: zakazivanje → prijem → digitalna inspekcija → predračun → odobrenje klijenta → rad i delovi → naplata → predaja → podsetnik za sledeći servis. Centralna celina je **vozilo** (ne nalog): sve se vezuje za vozilo, a vozilo ima istoriju vlasnika.

### 1.4. Diferencijatori u odnosu na postojeće proizvode (deo 2)

1. **Digitalni servisni karton sa deljivim linkom i QR kodom** — klijent bez naloga i aplikacije vidi odobrenu istoriju, fotografije i preporuke. Globalni proizvodi ovo rešavaju kroz „klijentski portal“ vezan za jedan nalog; ovde je karton vezan za vozilo i prati ga kroz vlasnike.
2. **Lokalizacija za Srbiju i region**: PDV logika, SEF (e-faktura, UBL 2.1), eFiskalizacija (ESIR → LPFR/VPFR), registarske oznake i tehnički pregled, Viber kao primarni kanal, ćirilica/latinica.
3. **Jednostavnost po ceni funkcija koje servis zaista koristi**: globalni proizvodi su građeni oko američkog tržišta (katalozi radnih sati, integracije sa veledrogerijama delova koje ovde ne postoje). Ovde je fokus na onome što radi u radionici sa 1–10 zaposlenih.
4. **Mobile-first unos iz jame**: fotografija → nalog u dva dodira, velike kontrole, rad bez stabilnog interneta (red za slanje).

### 1.5. Granice proizvoda (out of scope za sve verzije osim ako nije drugačije rečeno)

- Knjigovodstvo (glavna knjiga, bilansi) — rešava se izvozom i integracijom, ne implementira se.
- Katalog OEM podataka o popravkama (ALLDATA/Mitchell tip) — nije cilj.
- Prodavnica delova za javnost.
- Kompletno upravljanje voznim parkom za flotne klijente (telematika, gorivo).
- Nativne iOS/Android aplikacije — pokriva ih PWA; nativne se razmatraju tek posle v2.0.

---

## 2. Analiza tržišta i postojećih rešenja

### 2.1. Metodologija

Analizirani su (a) vodeći globalni cloud proizvodi za upravljanje auto-servisom po broju i oceni recenzija na agregatorima (Capterra, GetApp, G2), (b) regionalni proizvodi (Srbija, Hrvatska, Rumunija) i (c) domaći ERP/knjigovodstveni paketi sa servisnim modulom. Cilj analize nije rangiranje, nego: šta je **industrijski standard** (mora postojati), šta je **diferencijator**, šta je **lokalni zahtev** koji globalni proizvodi ne pokrivaju, i šta **svesno izostavljamo**.

### 2.2. Globalni proizvodi

| Proizvod | Pozicioniranje | Ključne funkcije koje definišu kategoriju | Šta učimo |
|---|---|---|---|
| **Tekmetric** (SAD) | Cloud, „data-driven“, za servise sa više zaposlenih | Neograničen broj korisnika na svim planovima, digitalna inspekcija (DVI) sa fotografijama/videom koje klijent vidi direktno, AI matrica za cene delova, dvosmerni SMS, integrisana naplata, izveštaji | Neograničeni korisnici kao model naplate; DVI i odobrenje klijenta kao jezgro toka; dvosmerna komunikacija |
| **Shopmonkey** (SAD) | Cloud, vizuelni tok rada (Kanban), SMB | Prilagodljiv tok rada po statusima, digitalni računi, online plaćanje, poruke klijentima, zakazivanje, DVI | Tabla po statusima kao glavni ekran; e-potpis odobrenja; plaćanje preko linka |
| **AutoLeap** (SAD/Kanada) | All-in-one, agresivno raste, sada i AI telefonski asistent („AIR“) | Zakazivanje, predračuni, DVI, naručivanje delova, QuickBooks integracija, marketing kampanje, kontrolna tabla; korisnici zameraju inventar (nema kategorija, nema automatske integracije delova) | Inventar mora imati kategorije i lokacije od početka; marketing podsetnici donose povratak klijenata |
| **Shop-Ware** (SAD) | Premium, za pojedinačne servise i lance (MSO) | DVI sa odobrenjem u realnom vremenu, transparentnost prema klijentu, multi-lokacija | Odobrenje stavke po stavki, ne celog predračuna |
| **AutoVitals** (SAD) | DVI + marketing | Digitalna inspekcija, automatizacija toka rada, zadržavanje klijenata, digitalni marketing | DVI kao alat prodaje: zeleno/žuto/crveno sa fotografijom povećava prihvatanje preporuka |
| **Autoflow** (ex autotext.me, SAD) | Komunikacija i DVI | Inspekcija → odobrenje, snimanje svakog detalja, transparentnost | Klijent želi da vidi *zašto*, ne samo *koliko* |
| **ARI** (globalno) | Jeftin, više vertikala (auto, moto, kamioni, čamci) | Nalozi, računi, CRM, statusi vidljivi klijentu; recenzenti zameraju nedosledne radne sate i loše šablone | Šabloni usluga moraju biti pouzdani; cene rada su stvar servisa, ne kataloga |
| **Mitchell 1 Manager SE** (SAD) | Klasičan desktop → cloud, integrisan sa OEM podacima | Nalozi, procene, delovi, integracija sa ProDemand bazom popravki | Ne idemo u OEM podatke; to je zasebna industrija |
| **ALLDATA Manage** (SAD) | OEM podaci + upravljanje | Procedure, DTC kodovi, šeme, TSB + nalozi, naručivanje delova | Isto — van obima |
| **Workshop Software** (Australija) | SMB, integracije sa knjigovodstvom (Xero, MYOB) | Nalozi, zalihe, kalendar, knjigovodstvene integracije | Model „knjigovodstvo se integriše, ne gradi“ |
| **Shop Boss, Torque360, AutoRepair Cloud, Digital Wrench, RO Writer, Identifix Shop Manager, RAMP (Indija)** | Različite niše | Pokrivaju isti osnovni skup: klijenti, vozila, nalozi, stavke, računi, zakazivanje, zalihe | Osnovni skup je komoditet; razlika je u UX-u i lokalizaciji |

### 2.3. Regionalni proizvodi

| Proizvod | Zemlja | Šta nudi | Šta učimo |
|---|---|---|---|
| **MCS „Servis“** | Hrvatska | Desktop program: najave na servis sa predviđenim trajanjem, kartica vozila sa svim servisima, utrošeni radovi i delovi, zamenska vozila, „šprance“ (šabloni) radnih naloga, nivoi prava korisnika 0–9 | Regionalna radionica prepoznaje pojmove „kartica vozila“, „najava“, „radni nalog“, „zamensko vozilo“; koristimo ih u UI |
| **Anolla** | Hrvatska | Online rezervacije za servis integrisane u web sajt, preporuke paketa po istoriji i kilometraži, upsell | Online zakazivanje kao modul v2; personalizacija po kilometraži |
| **WinMENTOR WME Auto Service** | Rumunija | Servisni modul unutar ERP-a: nalozi, flota, gume, ulaz od dobavljača, fakturisanje, fiskalni račun, valute | Flotni klijenti i evidencija guma (sezonsko skladištenje) su regionalno važni |
| **„Auto Servis“** (iOS, srpski autor) | Srbija | Unos vozila preko VIN-a ili OCR-a saobraćajne dozvole, istorija servisa, **štampa QR koda sa linkom do istorije**, skeniranje QR-a za pristup | Potvrda da je QR/link do istorije prepoznata potreba na domaćem tržištu; OCR saobraćajne dozvole je realna ušteda vremena |
| **Domaći knjigovodstveni / ERP paketi sa servisnim modulom** | Srbija | Rešavaju fiskalizaciju (ESIR/LPFR) i SEF; servis je obično radni nalog bez fotografija, inspekcije i klijentskog prikaza | Ne takmičimo se u fiskalizaciji — integrišemo se sa postojećim ESIR-om ili koristimo VPFR; takmičimo se u servisnom iskustvu |

### 2.4. Uporedna matrica funkcija

Legenda: ● standard u kategoriji (svi vodeći imaju), ◐ ima deo proizvoda, ○ retko, — nema / nije relevantno. Poslednja kolona je odluka za ServisKarton sa fazom.

| Funkcija | Globalni lideri | Regionalni | ServisKarton |
|---|---|---|---|
| Klijenti, vozila, više vozila po klijentu | ● | ● | P0 |
| Radni nalog sa stavkama rada i delova | ● | ● | P0 |
| Statusi naloga / Kanban tabla | ● | ◐ | P0 (lista), P1 (tabla) |
| Istorija vozila / kartica vozila | ● | ● | P0 |
| Fotografije i dokumenti na nalogu | ● | ○ | P0 |
| Evidencija uplata, dugovanja, delimične uplate | ● | ● | P0 |
| Pretraga po registraciji, VIN-u, klijentu | ● | ● | P0 |
| Deljivi link / klijentski prikaz istorije | ◐ (portal po nalogu) | ○ (QR) | **P0 — diferencijator** |
| Predračun → odobrenje klijenta (e-potpis, po stavci) | ● | ○ | P1 |
| Digitalna inspekcija vozila (DVI, zeleno/žuto/crveno) | ● | — | P1 |
| Dvosmerne poruke (SMS / Viber / WhatsApp / email) | ● (SMS) | ○ | P1 (Viber + SMS), P2 (WhatsApp) |
| Zakazivanje i kalendar, najave | ● | ● | P1 |
| Podsetnici za sledeći servis (datum / km) | ● | ◐ | P1 |
| Katalog usluga i delova, šabloni (paketi) | ● | ● | P1 |
| Magacin: stanje, min. količine, nabavka | ● | ● | P1 (osnovno), P2 (nabavka) |
| PDV, popusti, cenovnici | ● | ● | P0 (PDV), P1 (cenovnici) |
| Formalni račun / faktura, fiskalni račun | ● (US porezi) | ● (lokalno) | P1 (PDF račun), P2 (SEF, ESIR) |
| Knjigovodstvena integracija | ● (QuickBooks, Xero) | ● | P2 (izvoz + API) |
| Uloge i dozvole zaposlenih | ● | ● | P0 (3 uloge), P1 (granularno) |
| Izveštaji: prihod, marža, produktivnost | ● | ◐ | P1 |
| Multi-lokacija / lanci servisa | ◐ | ○ | P2 |
| Multi-tenant SaaS (više servisa) | ● | ○ | Arhitektura P0, komercijalno P2 |
| Online zakazivanje za klijente | ● | ◐ | P2 |
| Garancije na rad i delove, reklamacije | ◐ | ○ | P1 |
| Zamenska vozila | ○ | ● | P2 |
| Evidencija guma (sezonsko skladištenje) | ○ | ● | P2 |
| OCR saobraćajne dozvole, VIN dekodiranje | ◐ | ○ | P1 (VIN), P2 (OCR) |
| Integracija sa OEM bazama popravki | ◐ | — | — (van obima) |
| Online plaćanje kartica preko linka | ● | ○ | P2 |
| Rad bez interneta (red za slanje) | ○ | — | P1 |
| Audit log | ◐ | ○ | P0 (kritični), P1 (svi) |
| GDPR/ZZPL alati (izvoz, brisanje, anonimizacija) | ◐ | ○ | P1 |

### 2.5. Zaključci analize

1. **Osnovni skup je komoditet.** Klijenti–vozila–nalozi–stavke–uplate–dokumenti–pretraga postoje svuda. Ovde se ne pobeđuje funkcijama nego brzinom unosa i jasnoćom. Svaki ekran u delu 10 se meri brojem dodira do cilja.
2. **DVI + odobrenje je jezgro vrednosti lidera.** Svi vodeći proizvodi su se preselili sa „izdaj račun“ na „pokaži klijentu fotografiju, dobij odobrenje, pa radi“. Ovo je P1 i gradi se na istoj infrastrukturi kao deljivi karton (javni prikaz, tokeni, fotografije).
3. **Komunikacija je kanal, ne funkcija.** U SAD je SMS; u Srbiji je Viber, pa SMS, pa WhatsApp. Sistem poruka mora biti apstraktan nad kanalima (deo 7.14).
4. **Lokalni regulatorni zahtevi su barijera za globalne proizvode** i prilika za nas: PDV sa stopama 20 % / 10 % / 0 %, SEF (obavezan B2B za obveznike PDV-a), eFiskalizacija (fiskalni račun za fizička lica). Ovo gradimo kao integracije u P2, ali model podataka ih podržava od P0 (deo 8).
5. **Vozilo je centar, ne nalog.** Regionalni proizvodi (kartica vozila) i domaća iOS aplikacija (QR do istorije) to već rade. Lideri vezuju portal za nalog. Mi vezujemo karton za vozilo, sa istorijom vlasništva — to je odluka koja oblikuje ceo model podataka.
6. **Inventar koji ne prati stvarnost je gori od nikakvog.** Kritike AutoLeap-a to pokazuju. Zato je magacin u P1 minimalan (stanje po artiklu, min. količina, ručni ulaz/izlaz), a nabavka i serijski brojevi su P2.
7. **Cene rada su stvar servisa.** Ne pokušavamo da održavamo katalog normativa sati; servis unosi svoje cene i šablone.

---

## 3. Ciljni korisnici i persone

### 3.1. Interni korisnici (zaposleni u servisu)

| Persona | Opis | Uređaj | Šta mu treba | Čega se plaši |
|---|---|---|---|---|
| **Vlasnik / šef servisa** („Dragan, 48“) | Vodi servis sa 3–6 zaposlenih, često i sam radi. Odlučuje o kupovini softvera. | Telefon ceo dan, laptop uveče | Pregled: ko duguje, šta je otvoreno, koliko je zarađeno ovaj mesec; da kaže knjigovođi „evo izvoza“ | Da ga softver uspori; da zaposleni ne unose; da podaci nestanu |
| **Prijemni / servisni savetnik** („Milica, 31“) | Prima vozila, komunicira sa klijentima, piše predračune, naplaćuje. U malom servisu to je vlasnik. | Desktop/tablet na pultu | Brzo pronaći klijenta po tablici, otvoriti nalog, poslati predračun, naplatiti | Greška u iznosu; da zaboravi da pozove klijenta |
| **Mehaničar / tehničar** („Nemanja, 27“) | Radi u jami. Prljave ruke, rukavice, slabo svetlo. Ne voli kucanje. | Telefon (lični ili servisni), ponekad tablet | Da vidi šta treba da radi; da slika i doda u nalog u dva dodira; da označi „urađeno“ | Dugi formulari; da mora da se loguje svaki put |
| **Knjigovođa** (eksterni) | Dolazi jednom mesečno ili dobija izvoz. | Desktop | Izvoz računa i uplata po periodu; PDV pregled | Nekonzistentni podaci |

### 3.2. Eksterni korisnici (klijenti servisa)

| Persona | Opis | Šta mu treba |
|---|---|---|
| **Fizičko lice** („Jelena, 39“) | Jedan auto, dolazi 1–2 puta godišnje. Ne želi nalog ni aplikaciju. | Link: šta je rađeno, fotografije, koliko košta, šta je preporučeno, kad je sledeći servis; da odobri predračun jednim klikom |
| **Pravno lice / flota** („Fleet menadžer, 10–40 vozila“) | Više vozila, mesečno fakturisanje, zbirni pregled | Fakture na firmu, zbirno dugovanje, pregled svih vozila flote, izvoz |
| **Novi vlasnik polovnog vozila** | Kupio auto koji je servisiran ovde | Da vidi tehničku istoriju vozila (ne podatke prethodnog vlasnika) |

### 3.3. Administrativne persone (SaaS, P2)

- **Operater platforme** (mi): upravljanje tenantima, planovi, podrška, metrike.

---

## 4. Poslovni model i obim

### 4.1. Model isporuke

- **Faza MVP (P0):** jedan servis (pilot), ali arhitektura je multi-tenant od prvog dana (`tenant_id` svuda, RLS). Ovo je najjeftinije osiguranje protiv skupe migracije kasnije.
- **Verzija 1.0 (P1):** nekoliko servisa, ručno uključivanje (onboarding od strane operatera).
- **Verzija 2.0 (P2):** samostalna registracija servisa, planovi, naplata pretplate, multi-lokacija.

### 4.2. Predlog planova (za P2; utiče na feature-flagove u P0)

| Plan | Ciljni servis | Uključeno | Ograničenja |
|---|---|---|---|
| **Start** | 1–2 zaposlena | Klijenti, vozila, nalozi, uplate, dokumenti, karton + link | 1 lokacija, 5 GB skladišta, osnovni izveštaji |
| **Servis** | 3–10 zaposlenih | + DVI, predračun/odobrenje, zakazivanje, podsetnici, magacin, katalog, izveštaji | 1 lokacija, 50 GB, neograničeni korisnici |
| **Pro** | lanac / flota | + multi-lokacija, SEF/ESIR integracija, API, flotni portal, prioritetna podrška | neograničeno |

Princip (preuzet od Tekmetric-a): **ne naplaćuje se po korisniku.** Svaki mehaničar treba da ima nalog, inače se ne unosi.

### 4.3. Feature-flagovi

Sve P1/P2 funkcije MORAJU biti iza flagova na nivou tenanta (`tenant_features`), tako da se mogu uključivati postepeno i po planu, bez grananja koda po tenantu.

---

## 5. Rečnik

| Termin (UI) | Identifikator (kod) | Značenje |
|---|---|---|
| Servis | `tenant` | Jedna firma koja koristi aplikaciju; granica izolacije podataka |
| Lokacija | `location` | Fizička radionica unutar servisa (P2: više lokacija) |
| Zaposleni / korisnik | `user`, `membership` | Osoba sa nalogom; `membership` povezuje korisnika sa tenantom i ulogom |
| Klijent | `customer` | Fizičko ili pravno lice koje plaća uslugu |
| Vozilo | `vehicle` | Vozilo identifikovano VIN-om i/ili registracijom |
| Vlasništvo | `vehicle_ownership` | Period u kojem je klijent vlasnik/korisnik vozila |
| Karton vozila | `vehicle` + istorija | Hronološka servisna istorija vozila |
| Najava / termin | `appointment` | Zakazani dolazak |
| Radni nalog / nalog | `service_order` | Jedna servisna intervencija nad jednim vozilom |
| Stavka | `order_item` | Rad ili deo na nalogu, sa količinom i cenom |
| Predračun / ponuda | `estimate` | Skup stavki koje klijent treba da odobri |
| Inspekcija (DVI) | `inspection` | Digitalni pregled vozila po checklisti sa ocenama i fotografijama |
| Artikal | `catalog_item` | Šifra usluge ili dela iz kataloga servisa |
| Paket / šablon | `service_package` | Unapred definisan skup stavki (npr. „Mali servis 1.9 TDI“) |
| Magacin | `inventory_*` | Stanje delova na zalihama |
| Račun | `invoice` | Finansijski dokument prema klijentu (nefiskalni PDF ili fiskalni/SEF) |
| Uplata | `payment` | Priliv novca od klijenta, raspoređen na jedan ili više računa |
| Prilog | `attachment` | Fotografija, video, PDF ili drugi fajl |
| Deljivi link | `share_link` | Token koji daje ograničen javni pristup kartonu ili nalogu |
| Podsetnik | `reminder` | Zakazana poruka klijentu (sledeći servis, registracija, preuzimanje) |
| Garancija | `warranty` | Garantni rok na rad ili deo |
| Reklamacija | `claim` | Prijava problema u garantnom roku |
| ESIR | — | Elektronski sistem za izdavanje računa (softver koji šalje račun ka PFR-u) |
| PFR (LPFR/VPFR) | — | Procesor fiskalnih računa: lokalni (uređaj) ili virtuelni (servis Poreske uprave) |
| SEF | — | Sistem elektronskih faktura (e-faktura, UBL 2.1), obavezan za B2B između obveznika PDV-a |
| ZZPL | — | Zakon o zaštiti podataka o ličnosti (Srbija, usklađen sa GDPR-om) |

---
## 6. Korisnički tokovi (end-to-end)

Tokovi su opisani kao niz koraka sa akterom, akcijom, sistemskim odgovorom i referencom na zahteve u delu 7. Oznaka faze pokazuje kada tok postaje dostupan u celini.

### 6.1. Tok A — Prijem vozila bez termina (P0)

**Akter:** prijemni / vlasnik. **Uređaj:** desktop ili telefon. **Cilj:** otvoren nalog za 60 sekundi.

| # | Akcija korisnika | Odgovor sistema | Ref. |
|---|---|---|---|
| 1 | Na početnom ekranu kuca registarsku oznaku u globalnu pretragu (`BG123AB` ili `bg 123 ab`) | Normalizuje unos, prikazuje vozilo ako postoji, sa vlasnikom i poslednjim nalogom; ako ne postoji, nudi „Novo vozilo BG-123-AB“ | FR-SRCH-001, FR-VEH-003 |
| 2a | Vozilo postoji → klikće „Novi nalog“ | Otvara formu naloga sa popunjenim vozilom i trenutnim vlasnikom; traži kilometražu i opis problema | FR-ORD-001 |
| 2b | Vozilo ne postoji → „Novo vozilo“ | Forma: registracija (popunjena), VIN (opciono, sa dekodiranjem marke/modela/godišta ako je dostupno), marka, model, godište, gorivo; zatim izbor ili kreiranje klijenta | FR-VEH-001, FR-VEH-005, FR-CUS-001 |
| 3 | Unosi kilometražu, prijavljeni problem (slobodan tekst ili izbor iz čestih), opciono fotografiše vozilo pri prijemu (4 strane + tabla) | Nalog dobija broj (npr. `2026-00147`), status `Primljeno`, snima fotografije kao priloge tipa „prijem“ | FR-ORD-002, FR-ATT-001 |
| 4 | Opciono: štampa/šalje prijemnicu | Generiše PDF prijemnice (broj naloga, vozilo, km, prijavljeni problem, QR do kartona) i nudi slanje Viber/SMS/email | FR-DOC-001, FR-MSG-002 |
| 5 | Dodeljuje mehaničara (opciono) | Mehaničar vidi nalog u svom redu | FR-ORD-006 |

**Alternativni tokovi:** 1' — pretraga po imenu/telefonu klijenta umesto po tablici. 2' — vozilo postoji ali vlasnik je drugi klijent → sistem pita „Promena vlasnika?“ i pokreće tok H.

### 6.2. Tok B — Zakazani dolazak (P1)

1. Klijent zove ili dolazi; prijemni otvara kalendar, bira termin (dan, sat, trajanje, mehaničar/dizalica), bira vozilo i klijenta, upisuje razlog. Sistem kreira `appointment` i šalje potvrdu (Viber/SMS). (FR-APT-001..004)
2. Dan ranije sistem šalje podsetnik za termin (FR-MSG-004).
3. Na dan termina, kalendar/početna prikazuju „Danas dolazi“; klik „Prijem“ kreira nalog iz termina (prenosi vozilo, klijenta, razlog) → nastavlja Tok A od koraka 3. (FR-APT-006)
4. Nedolazak → termin se označava `Nije došao`; može se poslati poruka „Da zakažemo novi termin?“.

### 6.3. Tok C — Digitalna inspekcija i predračun (P1)

**Akteri:** mehaničar (inspekcija), prijemni (predračun), klijent (odobrenje).

| # | Akcija | Odgovor sistema | Ref. |
|---|---|---|---|
| 1 | Mehaničar otvara nalog na telefonu → „Inspekcija“ → bira šablon checkliste (npr. „Pregled pri malom servisu“, 25 stavki) | Kreira `inspection` sa stavkama iz šablona, sve u stanju „nije pregledano“ | FR-DVI-001 |
| 2 | Za svaku stavku dodiruje zeleno / žuto / crveno, opciono fotografija/video (do 30 s) i kratka napomena (glasovni unos → tekst) | Čuva ocenu, kompresuje medij na uređaju, stavlja u red za upload | FR-DVI-002, FR-ATT-003 |
| 3 | Označava inspekciju završenom | Status naloga ide u `Čeka predračun`; prijemni dobija notifikaciju | FR-DVI-004, FR-ORD-004 |
| 4 | Prijemni iz crvenih/žutih stavki pravi predračun: svaka stavka inspekcije → jedna ili više stavki rada/delova iz kataloga (ili slobodan unos), sa cenama; može označiti „preporučeno, nije hitno“ | Računa iznose sa PDV-om, grupiše po stavkama inspekcije, pravi `estimate` v1 | FR-EST-001, FR-EST-002, FR-FIN-001 |
| 5 | Šalje predračun klijentu | Generiše javni link (token), šalje poruku sa linkom; link prikazuje inspekciju (ocene + fotografije) i predračun po stavkama sa dugmetom „Odobri“ / „Odbij“ po stavci i „Odobri sve“ | FR-EST-004, FR-SHARE-005, FR-MSG-002 |
| 6 | Klijent odobrava/odbija stavke, unosi ime i potvrđuje (e-potpis: ime + IP + vreme) | Čuva odobrenje po stavci, zaključava predračun v1, prebacuje odobrene stavke u nalog kao stavke rada, odbijene ostaju kao „preporučeno“ na kartonu; status naloga → `Odobreno` ili `Delimično odobreno`; prijemni dobija notifikaciju | FR-EST-005, FR-EST-006, FR-ORD-004 |
| 7 | Ako klijent ne reaguje 24 h | Podsetnik; ako ni tada, prijemni zove i može ručno uneti usmeno odobrenje (beleži „usmeno, primio: Milica, 14:32“) | FR-EST-007 |

**Varijanta bez inspekcije (P0):** prijemni direktno pravi stavke na nalogu i, ako treba, šalje jednostavan predračun kao PDF/link (FR-EST-001 bez DVI veze).

### 6.4. Tok D — Rad, delovi i završetak (P0)

1. Mehaničar vidi odobrene stavke; dodaje stvarno utrošene delove (iz magacina ako postoji, ili slobodan unos: naziv, kataloški broj, količina, nabavna/prodajna cena), radne sate ili fiksnu cenu rada. (FR-ITM-001..005)
2. Ako deo nedostaje → status `Čeka deo`; opciono beleži dobavljača i očekivani datum; klijent može dobiti poruku „Čekamo deo, očekujemo…“. (FR-ORD-004, FR-MSG-003)
3. Tokom rada dodaje fotografije „pre/posle“ i fotografiju zamenjenog dela. (FR-ATT-001)
4. Upisuje preporuke za sledeći put (slobodan tekst + opciono datum ili kilometraža) → postaju podsetnici. (FR-ORD-008, FR-REM-001)
5. Označava „Završeno“. Sistem: proverava da sve odobrene stavke imaju status (urađeno / nije urađeno sa razlogom), zaključava stavke za mehaničara, obaveštava prijemnog, šalje klijentu „Vozilo je spremno“. (FR-ORD-004, FR-ORD-009)

### 6.5. Tok E — Naplata i predaja (P0 interna evidencija; P1 PDF račun; P2 fiskalni/SEF)

| # | Akcija | Odgovor sistema | Ref. |
|---|---|---|---|
| 1 | Prijemni otvara završen nalog → „Naplata“ | Prikazuje rekapitulaciju: rad, delovi, popust, osnovica po stopi, PDV, ukupno; prethodno uplaćen avans | FR-FIN-001..003 |
| 2 | Bira tip dokumenta: interni obračun (P0) / PDF račun (P1) / fiskalni račun (P2) / e-faktura SEF (P2, pravno lice) | Kreira `invoice` sa rednim brojem po tipu i godini, zamrzava stavke i cene (snapshot) | FR-INV-001..004 |
| 3 | Evidentira uplatu: iznos, način (gotovina, kartica, prenos, avans), datum | Kreira `payment`, raspoređuje na račun(e), računa preostalo; status naplate `Plaćeno` / `Delimično` / `Nije plaćeno` | FR-PAY-001..004 |
| 4 | Predaje vozilo → „Preuzeto“ | Status naloga `Preuzeto`, upisuje ko je preuzeo; kartonu dodaje završen nalog; šalje klijentu link ka kartonu + zahvalnicu (ako je uključeno) | FR-ORD-004, FR-SHARE-001, FR-MSG-005 |
| 5 | Delimično plaćeno → dugovanje | Pojavljuje se u „Dugovanja“, sa mogućnošću slanja opomene posle N dana | FR-PAY-005, FR-MSG-006 |

### 6.6. Tok F — Klijent otvara deljivi karton (P0)

1. Klijent dobija poruku sa linkom `https://app.example/k/<token>` ili skenira QR nalepnicu u vozilu.
2. Stranica (bez prijave) prikazuje: vozilo (marka, model, registracija delimično maskirana po podešavanju), listu naloga koje je servis označio vidljivim, za svaki: datum, kilometraža, izvršeni radovi (nazivi stavki, bez internih napomena i nabavnih cena), fotografije označene za deljenje, preporuke, sledeći servis. Iznosi se prikazuju samo ako je tenant uključio „prikaži cene klijentu“ (podrazumevano: da za fizička lica). (FR-SHARE-001..004)
3. Ako je link tipa „zahteva PIN“, stranica prvo traži 4–6-cifreni PIN (poslednje 4 cifre telefona ili PIN koji je servis zadao). (FR-SHARE-006)
4. Klijent može: preuzeti PDF kartona, kliknuti „Zakaži“ (P2), kliknuti „Pozovi servis“, odobriti otvoreni predračun (Tok C). (FR-SHARE-007)
5. Servis može opozvati link; opozvani link prikazuje „Link više nije aktivan, kontaktirajte servis“. (FR-SHARE-003)

### 6.7. Tok G — Podsetnik za sledeći servis (P1)

1. Pri završetku naloga sistem na osnovu preporuka ili pravila (npr. „mali servis na 15.000 km ili 12 meseci“) kreira `reminder` sa datumom i/ili kilometražom. (FR-REM-001..002)
2. Noćni posao proverava podsetnike koji dospevaju u narednih N dana (podešavanje, podrazumevano 14) i šalje poruku kanalom koji klijent preferira, sa linkom na karton i „Zakaži“. (FR-REM-003, FR-MSG-004)
3. Podsetnik za registraciju/tehnički pregled radi isto po datumu isteka registracije. (FR-REM-004)
4. Klijent može da se odjavi od podsetnika (link u poruci) → `customer.marketing_opt_out`. (FR-MSG-008)

### 6.8. Tok H — Promena vlasnika vozila (P0 model, P1 UI)

1. Prijemni na vozilu bira „Promena vlasnika“ → bira novog klijenta (ili ga kreira) i datum promene.
2. Sistem zatvara aktivno `vehicle_ownership` (upisuje `valid_to`), otvara novo (`valid_from`), i **ne menja** vlasnika na postojećim nalozima (nalog pamti ko je tada bio klijent).
3. Postojeći deljivi linkovi vozila se automatski opozivaju (prethodni vlasnik ne treba da vidi buduće radove, novi ne treba da vidi stari link).
4. Novi vlasnik na kartonu vidi tehničku istoriju (datum, km, radovi, javne fotografije) ali **ne** vidi ime, kontakte, cene ni dokumente prethodnog vlasnika; servis može pojedinačne stare naloge sakriti i od toga. (FR-VEH-007..009, FR-SHARE-008)

### 6.9. Tok I — Flotni klijent (P1 osnovno, P2 portal)

1. Klijent tipa pravno lice ima više vozila; svako vozilo ima polje „kontakt vozač“.
2. Nalozi se fakturišu zbirno: na kraju meseca prijemni bira „Zbirna faktura“ za klijenta i period → jedan `invoice` sa više naloga. (FR-INV-005)
3. Flotni portal (P2): link na nivou klijenta prikazuje sva vozila, otvorene naloge, dugovanja, izvoz CSV. (FR-SHARE-009)

### 6.10. Tok J — Reklamacija u garantnom roku (P1)

1. Vozilo se vraća; prijemni otvara nalog i bira „Reklamacija na nalog #…“. Sistem prikazuje stavke tog naloga sa garantnim rokom (npr. rad 6 meseci, deo 12 meseci / 20.000 km).
2. Prijemni bira stavke pod reklamacijom; novi nalog dobija vezu `claim_of_order_id`, stavke se unose sa cenom 0 ili sa oznakom „na teret dobavljača“.
3. Izveštaj „Reklamacije“ prikazuje stopu po mehaničaru i dobavljaču. (FR-WAR-001..004)

### 6.11. Tok K — Dnevni rad vlasnika (P0/P1)

1. Jutro: početna prikazuje „Danas“: termini, vozila u servisu po statusu, čeka deo, čeka odobrenje, spremno za preuzimanje, dugovanja koja dospevaju.
2. Tokom dana: Kanban tabla (P1) prevlači naloge kroz statuse.
3. Kraj dana: pregled naplate za dan po načinu plaćanja; „zaključi dan“ (P2, uz fiskalizaciju: dnevni izveštaj je stvar PFR-a, ne nas).
4. Kraj meseca: izvoz računa, uplata i stavki za knjigovođu (CSV/XLSX); izveštaj prihoda i marže. (FR-RPT-001..006, FR-IMP-003)

### 6.12. Tok L — Onboarding novog servisa (P1 ručno, P2 samostalno)

1. Registracija: naziv, PIB, matični broj, adresa, PDV status, logo, kontakt, vremenska zona, valuta (RSD; EUR za region).
2. Podešavanja: statusi naloga (podrazumevani set), stope PDV-a, način numerisanja, podrazumevane garancije, šabloni poruka, radno vreme, resursi (dizalice/mehaničari).
3. Pozivanje zaposlenih (email/SMS link, uloga).
4. Uvoz postojećih klijenata i vozila iz Excel/CSV šablona sa validacijom i pregledom pre potvrde. (FR-IMP-001..002)
5. Probni nalog sa test podacima koji se može obrisati jednim klikom.

---
## 7. Funkcionalni zahtevi po modulima

Format svakog zahteva: **ID** · prioritet · nivo obaveznosti · opis · kriterijumi prihvatanja (KP).

### 7.1. Autentifikacija, nalozi, uloge i dozvole (AUTH)

**FR-AUTH-001** · P0 · MORA · Prijava zaposlenih emailom i lozinkom; podrška za magic-link prijavu emailom.
KP: Pogrešna lozinka 5 puta za 15 min → privremeno zaključavanje 15 min i email obaveštenje. Sesija traje 30 dana uz „zapamti me“, inače 12 h.

**FR-AUTH-002** · P1 · TREBA · Dvofaktorska autentifikacija (TOTP) opciona po korisniku, obavezna za ulogu `owner` ako tenant to uključi.

**FR-AUTH-003** · P0 · MORA · Jedan korisnik može biti član više tenanata (`membership`), sa različitom ulogom u svakom. Pri prijavi bira aktivni tenant ako ih ima više.

**FR-AUTH-004** · P0 · MORA · Uloge (P0 set): `owner` (sve), `advisor` (prijemni: sve osim podešavanja tenanta, brisanja i finansijskih izveštaja o marži), `technician` (mehaničar: vidi dodeljene i sve otvorene naloge, menja stavke rada/delova i statuse rada, dodaje priloge; ne vidi nabavne cene, uplate ni kontakte klijenata osim imena i telefona).
KP: Matrica dozvola u prilogu A se sprovodi na backendu (RLS + provera u API sloju), ne samo skrivanjem u UI.

**FR-AUTH-005** · P1 · TREBA · Granularne dozvole: uloga je skup dozvola (`permission` enum), tenant može kreirati prilagođene uloge (npr. `accountant` samo čitanje finansija).

**FR-AUTH-006** · P0 · MORA · Pozivanje zaposlenog: owner unosi email/telefon i ulogu; zaposleni dobija link za postavljanje lozinke; pozivnica važi 7 dana.

**FR-AUTH-007** · P0 · MORA · Deaktivacija zaposlenog: nalog se deaktivira (ne briše), sesije se poništavaju, istorija ostaje sa imenom.

**FR-AUTH-008** · P1 · TREBA · PIN brza prijava na deljenom tabletu u radionici: uređaj je prijavljen tenant-nalogom „kiosk“, a zaposleni se identifikuje 4-cifrenim PIN-om za svaku akciju koja se evidentira (ko je uneo). Timeout 5 min neaktivnosti.

**FR-AUTH-009** · P0 · MORA · Reset lozinke emailom; link važi 1 h, jednokratan.

### 7.2. Podešavanja servisa (TEN)

**FR-TEN-001** · P0 · MORA · Osnovni podaci: naziv, pravni naziv, PIB, matični broj, adresa, telefon, email, web, logo, obveznik PDV-a (da/ne), tekući računi (više), vremenska zona, valuta, jezik UI, pismo (latinica/ćirilica).

**FR-TEN-002** · P0 · MORA · Numerisanje dokumenata: za svaki tip (nalog, predračun, račun, avansni račun, knjižno odobrenje) format sa placeholderima (`{YYYY}`, `{SEQ:5}`, `{LOC}`), reset brojača godišnje ili nikad. Podrazumevano: nalog `{YYYY}-{SEQ:5}`, račun `{SEQ}/{YYYY}`.
KP: Brojevi su strogo rastući bez rupa unutar tipa i godine, i pod konkurentnim upisom (test sa 50 paralelnih kreiranja → 50 različitih uzastopnih brojeva).

**FR-TEN-003** · P0 · MORA · Stope PDV-a: lista stopa (podrazumevano 20 %, 10 %, 0 %) sa oznakom i važenjem od–do; podrazumevana stopa za rad i za delove. Cene u katalogu se unose sa ili bez PDV-a po izboru tenanta (`prices_include_vat`).

**FR-TEN-004** · P0 · MORA · Statusi naloga: podrazumevani set (deo 7.6) se može preimenovati i proširiti dodatnim statusima između `in_progress` i `completed`; sistemski statusi (`received`, `completed`, `delivered`, `cancelled`) ne mogu se obrisati.

**FR-TEN-005** · P1 · TREBA · Radno vreme po danu, praznici, resursi za zakazivanje (dizalice, boksovi, mehaničari) sa kapacitetom.

**FR-TEN-006** · P1 · TREBA · Podrazumevane garancije: na rad (meseci), na delove (meseci i/ili km), po kategoriji artikla.

**FR-TEN-007** · P1 · TREBA · Šabloni poruka po događaju i kanalu (deo 7.14), sa placeholderima i pregledom.

**FR-TEN-008** · P0 · MORA · Podešavanja deljenja: podrazumevana vidljivost novih naloga klijentu (da/ne), prikaz cena na kartonu (da/ne/samo ukupno), zahtevaj PIN (da/ne), podrazumevani rok važenja linka (nikad / 30 / 90 / 365 dana), maskiranje registracije na javnoj strani.

**FR-TEN-009** · P1 · TREBA · Satnica rada (više cenovnika: standard, dijagnostika, električar), podrazumevana marža na delove (%), zaokruživanje (na 1, 10, 100 RSD).

**FR-TEN-010** · P2 · MOŽE · Više lokacija: svaka ima adresu, resurse, brojače i zalihe; korisnik ima podrazumevanu lokaciju; izveštaji po lokaciji i zbirno.

**FR-TEN-011** · P0 · MORA · Feature-flagovi po tenantu (čitaju se jednom po sesiji i keširaju; promena se vidi do 60 s).

### 7.3. Klijenti (CUS)

**FR-CUS-001** · P0 · MORA · Kreiranje klijenta: tip (`person` / `company`), ime i prezime ili naziv, telefon (više, sa oznakom primarni, normalizovan u E.164), email, adresa, PIB i matični broj za firmu, JBKJS za budžetske korisnike (P2), interne napomene, oznake (tagovi), preferirani kanal komunikacije, pristanak za marketing (datum i izvor).
KP: Telefon `064/123-45-67`, `+381641234567`, `0641234567` → isti zapis `+381641234567`. Validacija PIB-a kontrolnom cifrom (modul 11).

**FR-CUS-002** · P0 · MORA · Detekcija duplikata pri kreiranju: isti normalizovan telefon ili email ili PIB → upozorenje sa linkom na postojećeg klijenta i opcijom „Ipak kreiraj“ (zabeleži se).

**FR-CUS-003** · P1 · TREBA · Spajanje duplikata: owner bira dva klijenta → bira koji ostaje → sva vozila, nalozi, uplate i priloge se prebacuju, drugi se arhivira sa `merged_into_id`.

**FR-CUS-004** · P0 · MORA · Profil klijenta: vozila (trenutna i bivša), nalozi (filter po statusu), finansije (ukupno fakturisano, plaćeno, dugovanje, avansi), komunikacija (hronologija poruka), napomene, dokumenti na nivou klijenta (ugovor sa flotom).

**FR-CUS-005** · P0 · MORA · Arhiviranje klijenta (soft-delete): nestaje iz pretrage, ostaje na postojećim nalozima. Brisanje je dozvoljeno samo ako nema naloga; inače anonimizacija (deo 7.18).

**FR-CUS-006** · P1 · TREBA · Firma: više kontakt osoba (ime, uloga, telefon, email), uslovi plaćanja (odloženo N dana), zbirno fakturisanje mesečno, popust na nivou klijenta (%), oznaka „flota“.

**FR-CUS-007** · P1 · TREBA · Istorija komunikacije: sve poslate i primljene poruke, pozivi zabeleženi ručno („zvao, nije se javio“), sa autorom i vremenom.

### 7.4. Vozila (VEH)

**FR-VEH-001** · P0 · MORA · Polja: registarska oznaka (normalizovana: velika slova, bez razmaka/crtica; čuva se i originalan unos za prikaz), VIN (17 znakova, bez I/O/Q, validacija kontrolne cifre uz upozorenje, ne blokiranje — stara vozila imaju neispravne), marka, model, varijanta/motor, godište, gorivo (`petrol`, `diesel`, `lpg`, `cng`, `hybrid`, `phev`, `electric`), zapremina/snaga, boja, broj šasije ako nije VIN, broj motora, kilometraža (poslednja), jedinica (km/mi), datum isteka registracije, datum sledećeg tehničkog, napomene, fotografija profila.

**FR-VEH-002** · P0 · MORA · Jedinstvenost: unutar tenanta VIN je jedinstven (ako je unet); registracija nije jedinstvena kroz vreme (tablice se prenose), ali je jedinstvena među **aktivnim** vozilima — pri unosu postojeće aktivne registracije sistem pita da li je to isto vozilo.

**FR-VEH-003** · P0 · MORA · Pretraga vozila po delimičnoj registraciji (`123` nalazi `BG123AB`), VIN-u (poslednjih 6+ znakova), marki/modelu, vlasniku.

**FR-VEH-004** · P0 · MORA · Kilometraža: svaki nalog beleži km pri prijemu; vozilo čuva maksimum; unos manji od poslednjeg → upozorenje (ne blokada; može biti zamena table).

**FR-VEH-005** · P1 · TREBA · VIN dekodiranje: po unosu 17 znakova poziva se dekoder (WMI → marka, zemlja; godina iz 10. znaka; ostalo preko eksternog API-ja ako je dostupan) i predlaže marku/model/godište; korisnik potvrđuje.

**FR-VEH-006** · P2 · MOŽE · OCR saobraćajne dozvole (fotografija → registracija, VIN, marka, model, godina, vlasnik) sa pregledom pre čuvanja.

**FR-VEH-007** · P0 · MORA · Istorija vlasništva (`vehicle_ownership`): vozilo ima nula ili više perioda vlasništva; tačno jedan je aktivan (`valid_to IS NULL`) ili nijedan (vozilo bez poznatog vlasnika). Nalog pamti `customer_id` koji je bio vlasnik u trenutku kreiranja.

**FR-VEH-008** · P1 · TREBA · UI za promenu vlasnika (tok H), sa datumom i razlogom (prodaja, promena firme, greška u unosu — ova poslednja ne pravi novi period nego ispravlja postojeći).

**FR-VEH-009** · P0 · MORA · Pravilo vidljivosti: podaci o klijentu na nalozima iz prethodnog perioda vlasništva nisu dostupni novom vlasniku kroz deljivi link; interno su vidljivi ulogama `owner` i `advisor`.

**FR-VEH-010** · P1 · TREBA · Vozilo može imati više „korisnika“ (vozača) pored vlasnika: lista kontakata sa ulogom (`driver`), za flotne klijente.

**FR-VEH-011** · P2 · MOŽE · Evidencija guma: set guma (dimenzija, DOT, stanje), skladištenje (lokacija u magacinu, datum ulaska/izlaska), podsetnik za zamenu sezone.

**FR-VEH-012** · P1 · TREBA · QR nalepnica: generisanje PDF-a sa QR kodom koji vodi na karton vozila (deljivi link tipa „trajni“), za lepljenje u vozilo; štampa pojedinačno ili na tabaku A4 sa 24 nalepnice.

### 7.5. Zakazivanje i kalendar (APT)

**FR-APT-001** · P1 · TREBA · Kreiranje termina: datum/vreme početka, trajanje (15-minutni koraci), resurs (mehaničar i/ili boks), klijent, vozilo (može biti novo/nepoznato), razlog, napomena, status (`scheduled`, `confirmed`, `arrived`, `no_show`, `cancelled`).

**FR-APT-002** · P1 · TREBA · Prikazi: dan (kolone po resursu), nedelja, lista. Prevlačenje termina menja vreme/resurs. Preklapanje na istom resursu → upozorenje, dozvoljeno uz potvrdu.

**FR-APT-003** · P1 · TREBA · Automatska potvrda termina klijentu i podsetnik dan ranije (konfigurabilno), sa linkom „Potvrdi“ / „Otkaži“ (javna strana, token).

**FR-APT-004** · P1 · TREBA · Ponavljajući termini (flote: svaki prvi ponedeljak) — MOŽE, P2.

**FR-APT-005** · P1 · TREBA · Kapacitet dana: suma trajanja po resursu u odnosu na radno vreme; vizuelni indikator popunjenosti.

**FR-APT-006** · P1 · MORA · „Prijem“ iz termina kreira nalog i vezuje `appointment.service_order_id`.

**FR-APT-007** · P2 · MOŽE · Online zakazivanje: javna strana servisa (ili ugradivi widget) gde klijent bira uslugu iz liste ponuđenih, vidi slobodne termine, unosi vozilo i kontakt; termin ulazi kao `scheduled` i čeka potvrdu servisa.

### 7.6. Servisni nalozi (ORD)

**FR-ORD-001** · P0 · MORA · Nalog se kreira nad tačno jednim vozilom i jednim klijentom (vlasnik u tom trenutku, može se ručno promeniti pre prve stavke/računa). Polja: broj, status, datumi (kreiran, primljen, obećan završetak, završen, preuzet), km pri prijemu, nivo goriva (opciono, 0–8), prijavljeni problem, dijagnostika/nalaz, interne napomene (nikad se ne dele), napomena za klijenta (deli se), dodeljeni mehaničar(i), prijemni, prioritet (normalan/hitan), oznake, vidljivost na kartonu (da/ne), izvor (`walk_in`, `appointment`, `claim`).

**FR-ORD-002** · P0 · MORA · Dodela broja pri kreiranju po pravilu tenanta (FR-TEN-002). Broj se nikad ne menja.

**FR-ORD-003** · P0 · MORA · Mašina stanja statusa. Sistemski statusi i dozvoljeni prelazi:

```
received ──► in_progress ──► completed ──► delivered
   │              │  ▲            ▲
   │              ▼  │            │
   │        waiting_parts ────────┘ (nazad u in_progress)
   │              
   ├──► awaiting_estimate ──► awaiting_approval ──► approved ──► in_progress
   │                                  │
   │                                  └──► declined ──► (completed ili cancelled)
   └──► cancelled  (dozvoljeno iz svih osim delivered)
```

Prilagođeni statusi tenanta se umeću između `in_progress` i `completed` kao sekvenca. Prelaz unazad je dozvoljen za `owner`/`advisor` uz obavezan razlog (upisuje se u audit).
KP: API odbija nedozvoljen prelaz sa `409` i porukom koja navodi dozvoljene ciljne statuse.

**FR-ORD-004** · P0 · MORA · Svaka promena statusa se beleži (`order_status_history`: iz, u, ko, kad, razlog) i može okinuti poruku klijentu po šablonu (deo 7.14) ako je za taj prelaz uključeno.

**FR-ORD-005** · P0 · MORA · Zaključavanje: nakon izdavanja računa (`invoice` sa statusom `issued`) stavke i cene naloga su zaključane; izmena zahteva storniranje računa (knjižno odobrenje, P1) ili kreiranje dopunskog naloga.

**FR-ORD-006** · P0 · MORA · Dodela mehaničara (jednog ili više) sa ulogom na nalogu; mehaničar vidi „Moji nalozi“.

**FR-ORD-007** · P1 · TREBA · Evidencija vremena rada: start/stop tajmer po mehaničaru i stavci ili ručni unos trajanja; koristi se za izveštaj produktivnosti (prodati sati vs. utrošeni sati), ne mora da utiče na cenu.

**FR-ORD-008** · P0 · MORA · Preporuke: lista preporučenih radova sa prioritetom (`urgent`, `soon`, `monitor`), opciono procenjena cena, datum ili km dospeća; vidljive na kartonu; mogu se jednim klikom pretvoriti u stavke novog naloga ili predračuna.

**FR-ORD-009** · P0 · MORA · Prelaz u `completed` zahteva: sve stavke imaju status (`done` / `not_done` sa razlogom); ako postoji odobreni predračun, sve odobrene stavke su obrađene. Sistem to proverava i navodi šta nedostaje.

**FR-ORD-010** · P1 · TREBA · Kanban tabla: kolone = statusi, kartice = nalozi (registracija, marka/model, klijent, mehaničar, vreme u statusu, ikone: čeka deo / čeka odobrenje / neplaćeno), prevlačenje menja status (uz pravila iz FR-ORD-003).

**FR-ORD-011** · P1 · TREBA · Obećano vreme završetka i upozorenje kad se probije (vizuelno + opciona poruka klijentu „kasnimo“).

**FR-ORD-012** · P1 · TREBA · Kloniranje naloga („isto kao prošli put“) sa stavkama bez cena ili sa aktuelnim cenama iz kataloga.

**FR-ORD-013** · P0 · MORA · Štampa/PDF naloga (interna verzija sa svim podacima; verzija za klijenta bez internih napomena i nabavnih cena) — deo 7.19.

**FR-ORD-014** · P1 · TREBA · Checklista prijema: podrazumevana lista (dokumenti u vozilu, rezervni točak, oštećenja po dijagramu karoserije sa označavanjem tačaka na slici, lične stvari) sa fotografijama; potpis klijenta na ekranu pri prijemu (P2).

### 7.7. Predračun / ponuda i odobrenje klijenta (EST)

**FR-EST-001** · P0 · MORA · Predračun je verzionisan skup stavki (rad, delovi) sa cenama, PDV-om, popustom i ukupnim iznosom, vezan za nalog. Nalog može imati više predračuna (verzije); samo jedan može biti u statusu `sent`.

**FR-EST-002** · P1 · TREBA · Stavke predračuna se grupišu po „problemu“ (stavci inspekcije ili slobodnoj grupi), sa oznakom `required` / `recommended`. Klijent odobrava po grupi ili po stavci (podešavanje tenanta).

**FR-EST-003** · P0 · MORA · Statusi: `draft` → `sent` → (`approved` | `partially_approved` | `declined` | `expired`) ; `superseded` kad nova verzija zameni staru. Rok važenja predračuna (podrazumevano 7 dana).

**FR-EST-004** · P0 · MORA · Slanje: PDF predračuna + javni link (token) klijentu kanalom po izboru; na linku klijent vidi stavke, iznose, fotografije inspekcije (P1) i dugmad za odobrenje.

**FR-EST-005** · P1 · MORA · Odobrenje na javnoj strani: klijent bira stavke, unosi ime, štiklira saglasnost; sistem beleži `approval` (ko, kad, IP, user-agent, izabrane stavke, tekst saglasnosti sa verzijom). Odobrenje je nepromenljivo; nova odluka = novi zapis.

**FR-EST-006** · P1 · MORA · Po odobrenju odobrene stavke postaju stavke naloga (`order_item.source = estimate`, `estimate_item_id`), neodobrene ostaju kao preporuke (FR-ORD-008). Status naloga se menja (FR-ORD-003).

**FR-EST-007** · P0 · MORA · Ručno beleženje odobrenja (usmeno, telefonom, lično) od strane zaposlenog, sa obaveznom napomenom; vidljivo kao „odobrio zaposleni u ime klijenta“.

**FR-EST-008** · P1 · TREBA · Podsetnik za neodgovoreni predračun posle N sati (podrazumevano 24), najviše 2 puta.

**FR-EST-009** · P1 · TREBA · Dopunski predračun tokom rada (nađen dodatni kvar): nova verzija sadrži samo nove stavke, odobrava se nezavisno, prethodno odobrene stavke ostaju važeće.

### 7.8. Stavke, katalog i šabloni (ITM, CAT)

**FR-ITM-001** · P0 · MORA · Stavka naloga: tip (`labor`, `part`, `fee`, `discount`, `note`), naziv, opis, kataloški broj (za deo), količina (decimalna, do 3 mesta), jedinica (kom, h, l, kompl.), jedinična prodajna cena bez PDV-a, stopa PDV-a, popust (% ili iznos), ukupno; za deo: nabavna cena (vidljiva samo `owner`/`advisor`), dobavljač, da li je deo doneo klijent (`customer_supplied` → cena 0, bez garancije servisa na deo); za rad: sati i satnica ili fiksna cena; status (`pending`, `done`, `not_done`), razlog ako nije urađeno; mehaničar koji je uradio; garancija (meseci/km) nasleđena iz kataloga ili podešavanja; vidljivost klijentu (podrazumevano da; `note` tipa interno ne).

**FR-ITM-002** · P0 · MORA · Redosled stavki se može menjati; stavke se mogu grupisati pod naslovom (npr. „Prednje kočnice“).

**FR-ITM-003** · P0 · MORA · Obračun: `line_net = round(qty × unit_price × (1 − discount))`, `line_vat = round(line_net × rate)`, zaokruživanje na 2 decimale po stavci; zbirovi se računaju iz zaokruženih stavki (ne obrnuto), da bi se slagali sa štampanim dokumentom. Ako tenant unosi cene sa PDV-om, čuva se i neto i bruto i stopa, a neto se izvodi deljenjem i zaokružuje.
KP: Testni skup od 30 kombinacija količina/cena/popusta/stopa daje iste iznose kao referentna tabela.

**FR-ITM-004** · P0 · MORA · Brz unos: polje za pretragu kataloga (naziv, šifra, kataloški broj) sa predlozima; `Enter` dodaje stavku sa podrazumevanom cenom; slobodan unos ako nema u katalogu (opcija „sačuvaj u katalog“).

**FR-ITM-005** · P1 · TREBA · Deo iz magacina: izbor artikla sa stanjem; po označavanju `done` skida se sa zaliha (ili pri izdavanju računa — podešavanje); storno vraća.

**FR-CAT-001** · P1 · TREBA · Katalog artikala: tip (usluga/deo), šifra, naziv, opis, kategorija (hijerarhija), jedinica, podrazumevana cena (više cenovnika), stopa PDV-a, podrazumevano trajanje (za usluge, minute), garancija, kataloški broj proizvođača, OEM broj, dobavljač, barkod, aktivno/neaktivno.

**FR-CAT-002** · P1 · TREBA · Paketi (šabloni): naziv, opis, lista stavki iz kataloga sa količinama, opciono vezani za marku/model/motor; jednim klikom dodaju stavke na nalog/predračun. Primer: „Mali servis — ulje 5W30 ×4,5 l, filter ulja, filter vazduha, rad 1 h“.

**FR-CAT-003** · P1 · TREBA · Istorija cena artikla (ko je promenio, kad, sa–na); prethodni nalozi zadržavaju tadašnje cene.

**FR-CAT-004** · P1 · TREBA · Uvoz kataloga iz CSV/XLSX; izvoz.

**FR-CAT-005** · P2 · MOŽE · Predlog cene dela iz prethodnih naloga („poslednji put ovaj filter 2.400 RSD“).

### 7.9. Digitalna inspekcija vozila (DVI)

**FR-DVI-001** · P1 · TREBA · Šabloni inspekcije: naziv, sekcije (npr. „Spolja“, „Ispod haube“, „Podvozje“, „Kočnice“, „Gume“), stavke sa tipom ocene (`traffic_light` zeleno/žuto/crveno; `measurement` broj sa jedinicom i pragovima, npr. debljina diska mm, dubina šare mm, pritisak bar; `yes_no`; `text`), obavezna fotografija za crveno (podešavanje). Tenant dobija 3 podrazumevana šablona (brzi pregled 12 stavki, standardni 25, pre tehničkog 40).

**FR-DVI-002** · P1 · TREBA · Izvođenje na telefonu/tabletu: jedna stavka = jedan red sa tri velika dugmeta (zeleno/žuto/crveno) + ikona kamere + mikrofon za napomenu; merenja sa numeričkom tastaturom; napredak (12/25); može se prekinuti i nastaviti.

**FR-DVI-003** · P1 · TREBA · Fotografije u inspekciji se mogu anotirati (krug, strelica, tekst) pre čuvanja; originalna fotografija se čuva netaknuta, anotacija kao sloj (JSON) i renderovana kopija.

**FR-DVI-004** · P1 · TREBA · Završetak inspekcije: rezime (broj zelenih/žutih/crvenih), automatsko kreiranje preporuka iz žutih i crvenih (sa prioritetom `soon` / `urgent`), notifikacija prijemnom; status naloga → `awaiting_estimate` ako nema predračuna.

**FR-DVI-005** · P1 · TREBA · Javni prikaz inspekcije (na linku predračuna i kartona): stavke grupisane po boji (crveno prvo), fotografije u galeriji, merenja sa indikatorom u odnosu na prag, napomene za klijenta (ne interne).

**FR-DVI-006** · P1 · TREBA · Poređenje sa prethodnom inspekcijom istog vozila (npr. dubina šare 6 mm → 3,5 mm) — prikaz trenda na kartonu.

**FR-DVI-007** · P2 · MOŽE · Video do 60 s po stavci, sa automatskom kompresijom na 720p.

---
### 7.10. Magacin i nabavka (STK)

**FR-STK-001** · P1 · TREBA · Stanje po artiklu tipa deo: količina na stanju, rezervisano (na otvorenim nalozima), dostupno, minimalna količina, lokacija (polica), prosečna nabavna cena (ponderisana), poslednja nabavna cena.

**FR-STK-002** · P1 · TREBA · Kretanja zaliha (`inventory_movement`): tip (`in_purchase`, `out_order`, `return_order`, `adjustment`, `in_customer_supplied`, `transfer` P2), količina, jedinična cena, referenca (nalog, prijem, inventura), ko, kad. Stanje je uvek izvedeno iz kretanja (materijalizovano u koloni radi performansi, ali rekonstruktivno).

**FR-STK-003** · P1 · TREBA · Ručni ulaz robe: dobavljač, broj računa dobavljača, datum, stavke sa količinom i nabavnom cenom; prilog (skeniran račun).

**FR-STK-004** · P1 · TREBA · Upozorenje ispod minimuma na dashboardu i lista za naručivanje (artikal, dostupno, min, predlog količine).

**FR-STK-005** · P1 · TREBA · Inventura: popis sa unosom izbrojanog, razlika, potvrda → kretanja tipa `adjustment` sa razlogom.

**FR-STK-006** · P2 · MOŽE · Nabavka: narudžbenica dobavljaču (PDF/email), status (`draft`, `sent`, `partially_received`, `received`), prijem po narudžbenici, veza sa nalogom koji čeka deo (čim stigne, nalog dobija notifikaciju).

**FR-STK-007** · P2 · MOŽE · Više magacina / lokacija, transferi.

**FR-STK-008** · P2 · MOŽE · Barkod skeniranje kamerom telefona za ulaz i izdavanje.

### 7.11. Finansije: cene, PDV, računi, uplate (FIN, INV, PAY)

#### 7.11.1. Obračun i cene

**FR-FIN-001** · P0 · MORA · Rekapitulacija naloga: zbir rada, zbir delova, zbir naknada, popusti, osnovica po stopi PDV-a, PDV po stopi, ukupno; prikazuje se na nalogu, predračunu i računu. Pravila zaokruživanja iz FR-ITM-003.

**FR-FIN-002** · P0 · MORA · Popust na nivou naloga (% ili iznos) se raspoređuje proporcionalno po stavkama (da bi PDV po stopi bio tačan) i prikazuje kao posebna linija.

**FR-FIN-003** · P0 · MORA · Avans: uplata pre izdavanja računa se vodi kao avans klijenta; pri izdavanju računa avans se uračunava (P2: avansni račun po propisima ako je tenant obveznik PDV-a).

**FR-FIN-004** · P1 · TREBA · Valuta: podrazumevana RSD; tenant u drugoj zemlji bira EUR/BAM/MKD. Jedan tenant = jedna valuta (bez konverzija u v1/v2).

#### 7.11.2. Računi (dokumenti prema klijentu)

**FR-INV-001** · P0 · MORA · Tipovi dokumenata: `internal_statement` (interni obračun, P0, bez pravne snage, jasno označen „Nije fiskalni račun“), `invoice` (račun/faktura PDF, P1), `advance_invoice` (avansni račun, P2), `credit_note` (knjižno odobrenje/storno, P1), `fiscal_receipt` (fiskalni račun preko ESIR/PFR, P2), `e_invoice` (SEF, P2). Svaki ima svoj brojač.

**FR-INV-002** · P0 · MORA · Snapshot: pri izdavanju se kopiraju svi podaci stavki, cena, PDV, klijenta i servisa u `invoice` i `invoice_line` (JSON + normalizovane kolone); kasnije izmene naloga ili klijenta ne menjaju izdati dokument.

**FR-INV-003** · P1 · TREBA · Status dokumenta: `draft` → `issued` → (`paid` | `partially_paid` | `overdue` | `cancelled`); `issued` je nepromenljiv; ispravka samo kroz `credit_note` i novi dokument. Datum prometa, datum izdavanja, rok plaćanja (iz uslova klijenta), poziv na broj (model 97 sa kontrolnim brojem za uplatu na račun servisa).

**FR-INV-004** · P1 · TREBA · PDF računa sa svim elementima računa po Zakonu o PDV-u (naziv, adresa, PIB, matični broj izdavaoca i primaoca za pravna lica; broj i datum; datum prometa; opis, količina, cena, osnovica po stopi, PDV, ukupno; napomena o poreskom oslobođenju ako je 0 %; napomena „Nije obveznik PDV-a“ ako nije). Šablon sa logom; QR za plaćanje po NBS IPS standardu (P1, za uplate na račun).

**FR-INV-005** · P1 · TREBA · Zbirna faktura: jedan dokument za više završenih naloga istog klijenta u periodu; stavke grupisane po nalogu/vozilu.

**FR-INV-006** · P2 · MOŽE · **Fiskalizacija (ESIR):** za promet fizičkim licima (i na zahtev pravnim) sistem se ponaša kao ESIR: formira zahtev za fiskalni račun (stavke, GTIN/naziv, količina, cena, oznaka poreske stope, način plaćanja, PIB kupca opciono) i šalje ga PFR-u — LPFR-u (lokalni uređaj u servisu preko HTTP API-ja u lokalnoj mreži) ili VPFR-u (virtuelni PFR Poreske uprave preko interneta, sa sertifikatom). Čuva odgovor (broj računa, PFR vreme, verifikacioni URL/QR, žurnal), štampa/šalje fiskalni račun u propisanom obliku (žurnal + QR). Podržava tipove: promet-prodaja, promet-refundacija, avans-prodaja, avans-refundacija, predračun (nefiskalni). Offline režim LPFR-a (račun se izdaje, PFR šalje kasnije) je stvar PFR-a, ne nas. **Napomena:** akreditacija ESIR-a kod Poreske uprave je poseban projekat; alternativa je integracija sa već akreditovanim ESIR-om servisa (izvoz stavki u njegov format).

**FR-INV-007** · P2 · MOŽE · **SEF (e-faktura):** za pravna lica koja su obveznici PDV-a (i javni sektor) faktura se šalje u SEF kao UBL 2.1 XML po srpskoj CIUS specifikaciji (SRPS EN 16931), preko SEF API-ja (API ključ tenanta). Čuva se status (`sent`, `accepted`, `rejected`, `cancelled`, `storno`), ID iz SEF-a, PDF generisan od strane SEF-a. Knjižno odobrenje se takođe šalje u SEF. Primanje ulaznih e-faktura (od dobavljača delova) — P2+, MOŽE.

**FR-INV-008** · P1 · TREBA · Izvoz za knjigovodstvo: CSV/XLSX sa svim računima, stavkama i uplatama za period, u formatu koji knjigovođa potvrdi (šablon podesiv); P2: API/webhook.

#### 7.11.3. Uplate i dugovanja

**FR-PAY-001** · P0 · MORA · Uplata je na nivou **klijenta**: iznos, datum, način (`cash`, `card`, `bank_transfer`, `check` P2, `other`), referenca (broj izvoda/slipa), napomena, ko je evidentirao. Raspoređuje se na jedan ili više računa/naloga (`payment_allocation`); neraspoređeni deo je avans/preplata klijenta.
KP: Klijent ima dva neplaćena naloga (3.000 i 5.000); uplata 6.000 → raspored 3.000 + 3.000, preostalo na drugom 2.000; alternativno korisnik ručno menja raspored pre čuvanja.

**FR-PAY-002** · P0 · MORA · Automatski predlog rasporeda: najstariji neplaćeni prvo (FIFO); korisnik može promeniti.

**FR-PAY-003** · P0 · MORA · Status naplate naloga/računa izveden iz rasporeda: `unpaid`, `partially_paid`, `paid`, `overpaid` (upozorenje).

**FR-PAY-004** · P0 · MORA · Storno uplate (ne brisanje): kreira se suprotna transakcija sa razlogom; obe ostaju vidljive.

**FR-PAY-005** · P0 · MORA · Dugovanja: lista po klijentu i po nalogu, starost duga (0–30, 31–60, 61–90, 90+ dana), ukupno; filter po mehaničaru/periodu; izvoz.

**FR-PAY-006** · P1 · TREBA · Opomena: ručno ili automatski (podešavanje: posle N dana od roka) poruka klijentu sa iznosom, pozivom na broj i QR za plaćanje; evidentira se broj poslatih opomena.

**FR-PAY-007** · P2 · MOŽE · Online plaćanje karticom preko linka (lokalni PSP sa 3-D Secure); po uspehu automatski `payment`.

**FR-PAY-008** · P1 · TREBA · Dnevni pregled kase: uplate po načinu plaćanja za dan, po zaposlenom; „predaja smene“ sa potpisom (P2).

### 7.12. Fotografije i dokumenti (ATT)

**FR-ATT-001** · P0 · MORA · Prilog se vezuje za: nalog, stavku naloga, inspekciju/stavku inspekcije, vozilo, klijenta, račun, ulaz robe. Polja: tip fajla (image/jpeg, image/png, image/heic→konverzija u jpeg, video/mp4, application/pdf, ostalo do liste), kategorija (`intake`, `before`, `after`, `part`, `damage`, `document`, `invoice_scan`, `other`), naslov, napomena, ko, kad, vidljivost klijentu (podrazumevano po kategoriji: `intake/before/after/part/damage` da, `document/invoice_scan/other` ne), redosled.

**FR-ATT-002** · P0 · MORA · Upload sa telefona direktno iz kamere ili galerije, više fajlova odjednom, sa prikazom napretka po fajlu i mogućnošću otkazivanja.

**FR-ATT-003** · P0 · MORA · Obrada slika na klijentu pre slanja: korekcija orijentacije (EXIF), promena veličine na najviše 2048 px po dužoj strani, JPEG kvalitet ~82, uklanjanje GPS podataka iz EXIF-a; cilj ≤ 600 KB po fotografiji. Server generiše varijante: `thumb` 320 px, `medium` 1024 px, `original` (već smanjen).
KP: Fotografija od 12 MP / 5 MB sa iPhone-a stiže na server kao ≤ 800 KB i prikazuje se ispravno orijentisana.

**FR-ATT-004** · P0 · MORA · Skladište je privatno; pristup isključivo kroz potpisane URL-ove kratkog roka (15 min za interni UI, 60 min za javnu stranu) ili kroz server-proxy. Nijedan URL ne sme biti javno pogodiv.

**FR-ATT-005** · P1 · TREBA · Offline red: kada nema mreže, prilozi se čuvaju lokalno (IndexedDB) i šalju kad se mreža vrati; UI prikazuje „čeka slanje (3)“. Ograničenje reda: 200 MB.

**FR-ATT-006** · P0 · MORA · Brisanje priloga je soft-delete 30 dana (korpa), zatim trajno iz skladišta; prilozi na izdatim računima se ne mogu brisati.

**FR-ATT-007** · P1 · TREBA · Galerija po vozilu kroz sve naloge, filter po kategoriji i datumu; poređenje „pre/posle“ slajderom.

**FR-ATT-008** · P1 · TREBA · Skeniranje dokumenata: kamera → automatsko sečenje ivica i ispravljanje perspektive → PDF (više strana).

**FR-ATT-009** · P2 · MOŽE · Antivirus skeniranje PDF/ostalih fajlova pre dostupnosti (ClamAV u pozadinskom poslu); do završetka prilog je „u obradi“.

### 7.13. Digitalni servisni karton, deljivi link i klijentski portal (SHARE)

**FR-SHARE-001** · P0 · MORA · Tipovi deljivih linkova: `vehicle_card` (karton vozila: svi vidljivi nalozi vozila u tekućem periodu vlasništva + tehnička istorija ranijih perioda bez ličnih podataka), `order` (jedan nalog), `estimate` (predračun sa odobrenjem), `inspection` (inspekcija), `appointment` (potvrda termina), `customer_portal` (P2, flota). Svaki link ima: token, tip, cilj, kreiran od, rok važenja (ili bez), opcioni PIN, maksimalan broj otvaranja (opciono), status (`active`, `revoked`, `expired`), brojač otvaranja, poslednje otvaranje.

**FR-SHARE-002** · P0 · MORA · Token: najmanje 128 bita entropije iz kriptografskog generatora, URL-safe base64 (22+ znaka); u bazi se čuva samo **heš** tokena (SHA-256); token se prikazuje samo u trenutku kreiranja i u poslatim porukama. Putanja `/k/<token>`.

**FR-SHARE-003** · P0 · MORA · Opoziv: trenutan; opozvani i istekli linkovi vraćaju neutralnu stranicu bez podataka. Automatski opoziv svih linkova vozila pri promeni vlasnika (tok H). Lista aktivnih linkova po vozilu/klijentu sa dugmetom „Opozovi“.

**FR-SHARE-004** · P0 · MORA · Sadržaj kartona strogo po pravilima vidljivosti: samo nalozi `visible_to_customer = true` i u statusu `completed`/`delivered` (otvoreni nalozi su vidljivi kao „u toku“ sa statusom, bez stavki osim ako tenant uključi); samo stavke `visible_to_customer = true`; nikad: interne napomene, nabavne cene, marže, podaci zaposlenih osim imena mehaničara (podešavanje), podaci drugih klijenata, dokumenti koji nisu označeni za deljenje. Cene prema FR-TEN-008.
KP: Automatizovani test prolazi kroz javni API/stranicu sa linkom i proverava da nijedno polje sa liste zabranjenih ne postoji u odgovoru (ni u JSON-u ni u HTML-u).

**FR-SHARE-005** · P1 · MORA · Link predračuna prikazuje inspekciju i stavke i omogućava odobrenje (FR-EST-005). Nakon isteka predračuna, link prikazuje „predračun je istekao, kontaktirajte servis“.

**FR-SHARE-006** · P0 · MORA · PIN zaštita (opciono po linku ili podrazumevano po tenantu): 4–6 cifara; posle 5 pogrešnih unosa link se privremeno blokira 1 h i servis dobija obaveštenje.

**FR-SHARE-007** · P0 · MORA · Akcije klijenta na kartonu: preuzmi PDF kartona, pozovi servis (tel link), pošalji poruku servisu (forma → interna poruka na nalog, P1), zakaži termin (P2). Nema prijave, nema kreiranja naloga.

**FR-SHARE-008** · P0 · MORA · Tehnička istorija za nove vlasnike: nalozi iz prethodnih perioda vlasništva prikazuju datum, km, nazive izvršenih radova i delova (bez cena), javne fotografije kategorije `before/after/part`; tenant može isključiti ovo globalno ili po nalogu (`share_with_future_owners`).

**FR-SHARE-009** · P2 · MOŽE · Flotni portal: link na nivou klijenta sa opcionom prijavom (email + kod), lista vozila, otvoreni nalozi, predračuni za odobrenje, fakture i dugovanja, izvoz CSV.

**FR-SHARE-010** · P0 · MORA · Javne strane su indeksiranju zabranjene (`noindex`, `X-Robots-Tag`), nemaju analitiku trećih strana, nemaju kolačiće osim tehničkih; rate limit po IP-u i po tokenu.

**FR-SHARE-011** · P1 · TREBA · Evidencija pristupa linku (vreme, IP skraćen, user-agent) vidljiva servisu („otvoreno 3 puta, poslednji put juče 18:40“); čuva se 90 dana.

**FR-SHARE-012** · P1 · TREBA · QR kod linka u PDF-ovima (prijemnica, račun, nalepnica) i na ekranu za skeniranje na pultu.

### 7.14. Komunikacija i notifikacije (MSG)

**FR-MSG-001** · P1 · TREBA · Apstrakcija kanala: `channel` ∈ {`viber`, `sms`, `whatsapp` P2, `email`, `push` (interno, PWA)}. Svaka poruka ima: tenant, klijent/kontakt, kanal, šablon i verziju, renderovan sadržaj, status (`queued`, `sent`, `delivered`, `read`, `failed`, `undeliverable`), ID kod provajdera, cenu (ako provajder vraća), vezu na nalog/predračun/termin/podsetnik.

**FR-MSG-002** · P0 · MORA (ručno slanje) · P1 (automatsko) · Slanje linka kartona/predračuna/naloga klijentu: P0 — dugme „Kopiraj poruku“ i „Podeli“ (Web Share API na telefonu → otvara Viber/WhatsApp/SMS sa gotovim tekstom; na desktopu kopira tekst) i slanje emailom iz sistema; P1 — direktno slanje preko SMS/Viber provajdera.

**FR-MSG-003** · P1 · TREBA · Događaji koji okidaju poruke (svaki se uključuje/isključuje po tenantu i ima šablon): termin kreiran, podsetnik za termin, vozilo primljeno (prijemnica), predračun poslat, podsetnik za predračun, čeka deo, vozilo spremno, vozilo preuzeto (karton + zahvalnica), podsetnik za sledeći servis, podsetnik za registraciju, opomena za dug, rođendan (P2, opciono).

**FR-MSG-004** · P1 · TREBA · Viber Business Messages i SMS fallback: pokušaj Viber → ako nije isporučeno u X min (podesivo, podrazumevano 10), pošalji SMS. Trošak se evidentira.

**FR-MSG-005** · P1 · TREBA · Šabloni sa placeholderima (`{customer.first_name}`, `{vehicle.plate}`, `{order.number}`, `{link}`, `{amount}`, `{shop.name}`, `{shop.phone}`), višejezični (jezik klijenta), sa pregledom i proverom dužine (SMS segmenti).

**FR-MSG-006** · P1 · TREBA · Dvosmerno (ulazne poruke): odgovori klijenta preko Viber/SMS webhooka se vezuju za klijenta po broju i prikazuju u „Inbox“ i na nalogu; zaposleni odgovara iz aplikacije.

**FR-MSG-007** · P1 · TREBA · Interne notifikacije zaposlenima (u aplikaciji + push): dodeljen nalog, inspekcija završena, predračun odobren/odbijen, poruka klijenta, deo stigao, nalog kasni. Podešavanje po korisniku.

**FR-MSG-008** · P1 · MORA · Odjava od marketinških poruka (podsetnici su transakcione, ali servis bira da li ih tretira kao marketing); link za odjavu u svakoj poruci koja nije transakciona; evidencija pristanka (datum, izvor, tekst).

**FR-MSG-009** · P1 · TREBA · Tiho vreme: automatske poruke se ne šalju pre 08:00 ni posle 20:00 po vremenskoj zoni servisa, osim „vozilo spremno“ ako je servis otvoren.

### 7.15. Pretraga, početni ekran i izveštaji (SRCH, DASH, RPT)

**FR-SRCH-001** · P0 · MORA · Globalna pretraga (jedno polje, `Ctrl/Cmd+K`): registracija (normalizovano, delimično), VIN (delimično), ime/prezime/naziv klijenta, telefon (delimično, normalizovano), broj naloga, broj računa. Rezultati grupisani po tipu, najviše 5 po tipu, ukupno < 300 ms za 100.000 zapisa.

**FR-SRCH-002** · P1 · TREBA · Pretraga stavki („gde smo ugradili ovaj kataloški broj“) i priloga po naslovu.

**FR-DASH-001** · P0 · MORA · Početni ekran: brojači sa linkovima — vozila u servisu po statusu, čeka deo, čeka odobrenje, spremno za preuzimanje, neplaćeno (iznos), danas termini (P1); lista poslednjih 10 naloga; brzo dugme „Novi prijem“.

**FR-DASH-002** · P1 · TREBA · Vlasnički pregled: prihod danas/nedelja/mesec vs. prethodni period, prosečna vrednost naloga, broj naloga, prihvaćenost predračuna (%), prodati sati, dug ukupno, zalihe ispod minimuma.

**FR-RPT-001** · P1 · TREBA · Prihod po periodu, po tipu stavke (rad/delovi), po mehaničaru, po kategoriji usluge, po klijentu (top 20), po marki vozila; tabela + grafikon; izvoz.

**FR-RPT-002** · P1 · TREBA · Marža: prodajna − nabavna po delu, po nalogu, po periodu (samo `owner` i uloge sa dozvolom).

**FR-RPT-003** · P1 · TREBA · Produktivnost: prodati sati vs. evidentirani sati po mehaničaru (ako se koristi FR-ORD-007), prosečno vreme u statusu, broj naloga.

**FR-RPT-004** · P1 · TREBA · Naplata: po načinu plaćanja, po danu, starost dugova, prosečno vreme do naplate.

**FR-RPT-005** · P1 · TREBA · Klijenti: novi vs. povratni, klijenti koji nisu dolazili > 12 meseci (lista za kampanju), vozila sa istekom registracije u narednih 60 dana.

**FR-RPT-006** · P1 · TREBA · PDV pregled: osnovica i PDV po stopi za period, iz izdatih dokumenata (kontrolno, ne zamena za knjigovodstvo).

**FR-RPT-007** · P2 · MOŽE · Prilagođeni izveštaji (izbor kolona i filtera) i zakazano slanje emailom.

### 7.16. Garancije i reklamacije (WAR)

**FR-WAR-001** · P1 · TREBA · Svaka stavka naloga tipa rad ili deo ima garantni rok (meseci i/ili km), nasleđen iz kataloga/podešavanja i promenljiv po stavci; `customer_supplied` delovi nemaju garanciju servisa.

**FR-WAR-002** · P1 · TREBA · Na kartonu i nalogu je vidljivo „u garanciji do…“ po stavci; pretraga „aktivne garancije po vozilu“.

**FR-WAR-003** · P1 · TREBA · Reklamacija: novi nalog tipa `claim` vezan za originalni nalog i stavke; stavke sa oznakom `warranty_covered` (cena 0, trošak servisa) ili `supplier_claim` (potraživanje od dobavljača, sa statusom).

**FR-WAR-004** · P1 · TREBA · Izveštaj reklamacija po mehaničaru, dobavljaču, artiklu; stopa u odnosu na broj naloga.

### 7.17. Uvoz i izvoz podataka (IMP)

**FR-IMP-001** · P1 · TREBA · Uvoz klijenata i vozila iz CSV/XLSX: preuzimanje šablona, upload, mapiranje kolona (sa automatskim predlogom po nazivu), validacija (telefon, VIN, duplikati), pregled sa greškama po redu, delimičan uvoz (samo validni) ili prekid, izveštaj.

**FR-IMP-002** · P2 · MOŽE · Uvoz istorije naloga (datum, km, opis, iznos) kao „istorijski nalozi“ (status `delivered`, bez stavki ili sa jednom slobodnom stavkom).

**FR-IMP-003** · P0 · MORA · Izvoz: svaki tabelarni prikaz ima „Izvezi CSV/XLSX“ sa aktivnim filterima; kompletan izvoz podataka tenanta (ZIP sa CSV po tabeli + prilozi) na zahtev `owner`-a (asinhrono, link važi 24 h).

**FR-IMP-004** · P2 · MOŽE · Javni REST API sa API ključevima po tenantu (čitanje svega, pisanje klijenata/vozila/termina) i webhookovi (nalog promenio status, račun izdat, uplata evidentirana).

### 7.18. Audit log i alati za zaštitu podataka (AUD, GDPR)

**FR-AUD-001** · P0 · MORA · Audit log za kritične entitete (nalog, stavka, račun, uplata, klijent, vozilo, deljivi link, podešavanja, članstvo): ko, kad, šta (entitet, ID), akcija (`create`, `update`, `delete`, `status_change`, `share`, `revoke`, `export`, `login`, `permission_change`), diff promenjenih polja (stara → nova vrednost, osetljiva polja maskirana), IP, user-agent. Nepromenljiv (append-only), čuva se najmanje 3 godine (podesivo), vidljiv `owner`-u sa filterima.

**FR-AUD-002** · P1 · TREBA · Audit za sve entitete; pregled istorije na svakom entitetu („Istorija izmena“).

**FR-GDPR-001** · P1 · TREBA · Izvoz podataka jednog klijenta (pravo na pristup): PDF/JSON sa svim ličnim podacima, vozilima, nalozima, porukama, pristancima.

**FR-GDPR-002** · P1 · TREBA · Anonimizacija klijenta (pravo na brisanje uz zadržavanje poslovnih dokumenata): ime → „Klijent #1234“, kontakti i adresa brišu se, prilozi kategorije `document` brišu se, nalozi i računi ostaju (zakonska obaveza čuvanja računa), audit beleži ko i kad. Nepovratno; zahteva potvrdu lozinkom.

**FR-GDPR-003** · P1 · TREBA · Politika zadržavanja po tenantu: koliko se čuvaju poruke (podrazumevano 24 meseca), logovi pristupa linkovima (90 dana), evidencija pristupa (12 meseci), neaktivni klijenti bez naloga (36 meseci → predlog za brisanje). Noćni posao sprovodi politiku i beleži šta je obrisano.

**FR-GDPR-004** · P1 · TREBA · Evidencija pristanaka (`consent`): svrha (podsetnici, marketing, deljenje sa budućim vlasnikom), datum, izvor (usmeno/forma/link), tekst, povlačenje.

**FR-GDPR-005** · P1 · TREBA · Registar obrade za tenant (statički dokument koji generišemo sa podacima tenanta) i tekst obaveštenja o obradi za klijente (link na javnoj strani) — predlog teksta daje pravnik, sistem ga samo prikazuje.

### 7.19. Štampa i PDF dokumenti (DOC)

**FR-DOC-001** · P0 · MORA · Dokumenti: prijemnica (P0), radni nalog interni i za klijenta (P0), predračun (P0), interni obračun (P0), račun (P1), knjižno odobrenje (P1), karton vozila (P0), inspekcioni izveštaj (P1), QR nalepnica (P1), zbirna faktura (P1), narudžbenica (P2), inventurna lista (P1).

**FR-DOC-002** · P0 · MORA · Generisanje na serveru iz HTML šablona (isti renderer za sve), A4 i 80 mm (termalni, za prijemnicu i fiskalni), zaglavlje sa logom i podacima servisa, podnožje sa brojem strane, QR kod gde je definisan. PDF se čuva kao prilog dokumenta (nepromenljiv za izdate račune).

**FR-DOC-003** · P1 · TREBA · Šabloni prilagodljivi po tenantu: logo, boje, tekst u podnožju (napomene, uslovi garancije), prikaz/skrivanje kolona (npr. bez jediničnih cena rada).

**FR-DOC-004** · P0 · MORA · Jezik dokumenta: srpski latinica podrazumevano, ćirilica i engleski po izboru na dokumentu (klijent stranac).

---
## 8. Model podataka

### 8.1. Principi

1. **Multi-tenant od prvog dana.** Svaka poslovna tabela ima `tenant_id UUID NOT NULL` i RLS politiku. Nema izuzetaka. Globalne tabele (dekoder VIN-a, šifarnici) su bez `tenant_id` i read-only.
2. **Vozilo je centar.** Istorija vlasništva je zasebna tabela sa vremenskim rasponom; nalog pamti i `vehicle_id` i `customer_id` (ko je tada bio klijent).
3. **Novac kao `NUMERIC(14,2)`**, stope PDV-a kao `NUMERIC(5,2)` (20.00), količine `NUMERIC(12,3)`. Zbirovi se čuvaju materijalizovano na nalogu/računu i preračunavaju trigerom/servisnim slojem iz stavki, nikad ručno.
4. **Nepromenljivi finansijski dokumenti.** `invoice`/`invoice_line` posle `issued` su read-only (trigger odbija UPDATE osim statusnih polja). Ispravke su novi redovi.
5. **Soft-delete** (`deleted_at`) na klijentima, vozilima, artiklima, prilozima, nalozima u statusu `cancelled`. Hard delete samo kroz politiku zadržavanja.
6. **UUID v7** (vremenski sortabilni) kao primarni ključevi; ljudima čitljivi brojevi (`number`) su posebne kolone sa sekvencama po tenantu.
7. **`created_at`, `updated_at`, `created_by`, `updated_by`** na svim poslovnim tabelama (trigger za `updated_at`).
8. **Pretraga**: `pg_trgm` GIN indeksi na normalizovanim kolonama (`plate_normalized`, `vin`, `search_text` na klijentu).

### 8.2. ER pregled (tekstualno)

```
tenant 1──* location
tenant 1──* membership *──1 auth.users
tenant 1──* customer 1──* customer_contact
customer 1──* vehicle_ownership *──1 vehicle           (vremenski raspon, bez preklapanja po vozilu)
vehicle  1──* service_order *──1 customer               (klijent u trenutku naloga)
service_order 1──* order_item
service_order 1──* order_status_history
service_order 1──* estimate 1──* estimate_item ; estimate 1──* approval
service_order 1──* inspection 1──* inspection_result *──1 inspection_template_item
service_order *──1 appointment (opciono)
service_order 1──* attachment  (polimorfno: entity_type + entity_id)
service_order 1──* invoice 1──* invoice_line           (zbirna faktura: invoice *──* service_order kroz invoice_line.service_order_id)
customer 1──* payment 1──* payment_allocation *──1 invoice (ili service_order u P0)
catalog_item 1──* inventory_movement ; catalog_item 1──1 inventory_stock
service_package 1──* service_package_item *──1 catalog_item
share_link ──► (vehicle | service_order | estimate | inspection | appointment | customer)
message *──1 message_template ; reminder 1──* message
audit_log (append-only) ; consent
```

### 8.3. Enumi

```sql
CREATE TYPE customer_type       AS ENUM ('person','company');
CREATE TYPE fuel_type           AS ENUM ('petrol','diesel','lpg','cng','hybrid','phev','electric','other');
CREATE TYPE membership_role     AS ENUM ('owner','advisor','technician','accountant','kiosk','custom');
CREATE TYPE order_status        AS ENUM ('received','awaiting_estimate','awaiting_approval','approved','declined',
                                         'in_progress','waiting_parts','completed','delivered','cancelled');
  -- prilagođeni statusi tenanta se čuvaju u tenant_order_status (base_status + label + sort), vidi 8.4.7
CREATE TYPE order_source        AS ENUM ('walk_in','appointment','claim','import','online');
CREATE TYPE order_priority      AS ENUM ('normal','urgent');
CREATE TYPE item_type           AS ENUM ('labor','part','fee','discount','note');
CREATE TYPE item_status         AS ENUM ('pending','done','not_done');
CREATE TYPE item_source         AS ENUM ('manual','estimate','package','clone','claim');
CREATE TYPE estimate_status     AS ENUM ('draft','sent','approved','partially_approved','declined','expired','superseded');
CREATE TYPE approval_method     AS ENUM ('link','verbal','in_person','phone','email');
CREATE TYPE inspection_status   AS ENUM ('in_progress','completed');
CREATE TYPE rating_type         AS ENUM ('traffic_light','measurement','yes_no','text');
CREATE TYPE traffic_light       AS ENUM ('green','yellow','red','na');
CREATE TYPE appointment_status  AS ENUM ('scheduled','confirmed','arrived','no_show','cancelled');
CREATE TYPE invoice_type        AS ENUM ('internal_statement','invoice','advance_invoice','credit_note','fiscal_receipt','e_invoice');
CREATE TYPE invoice_status      AS ENUM ('draft','issued','paid','partially_paid','overdue','cancelled');
CREATE TYPE payment_method      AS ENUM ('cash','card','bank_transfer','check','other');
CREATE TYPE movement_type       AS ENUM ('in_purchase','out_order','return_order','adjustment','in_customer_supplied','transfer_in','transfer_out');
CREATE TYPE attachment_category AS ENUM ('intake','before','after','part','damage','document','invoice_scan','inspection','other');
CREATE TYPE share_link_type     AS ENUM ('vehicle_card','order','estimate','inspection','appointment','customer_portal');
CREATE TYPE share_link_status   AS ENUM ('active','revoked','expired');
CREATE TYPE message_channel     AS ENUM ('viber','sms','whatsapp','email','push','manual');
CREATE TYPE message_status      AS ENUM ('queued','sent','delivered','read','failed','undeliverable');
CREATE TYPE message_direction   AS ENUM ('outbound','inbound');
CREATE TYPE reminder_kind       AS ENUM ('next_service','registration','inspection_due','appointment','estimate_followup','debt','custom');
CREATE TYPE reminder_status     AS ENUM ('scheduled','sent','done','cancelled');
CREATE TYPE recommendation_priority AS ENUM ('urgent','soon','monitor');
CREATE TYPE consent_purpose     AS ENUM ('service_reminders','marketing','share_future_owner','data_processing');
CREATE TYPE audit_action        AS ENUM ('create','update','delete','status_change','share','revoke','export','login','logout','permission_change','anonymize');
```

### 8.4. Tabele (DDL)

Konvencija: izostavljene su ponavljajuće kolone `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `created_by UUID REFERENCES auth.users(id)`, `updated_by UUID` — sve poslovne tabele ih imaju. `auth.users` je Supabase tabela korisnika.

#### 8.4.1. Tenant, lokacije, članstva, podešavanja

```sql
CREATE TABLE tenant (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  slug               TEXT UNIQUE NOT NULL,                       -- za URL i javne strane
  name               TEXT NOT NULL,
  legal_name         TEXT,
  tax_id             TEXT,                                       -- PIB
  registration_no    TEXT,                                       -- matični broj
  vat_registered     BOOLEAN NOT NULL DEFAULT false,
  address            JSONB,                                      -- {street, city, postal_code, country}
  phone              TEXT, email TEXT, website TEXT,
  logo_path          TEXT,
  timezone           TEXT NOT NULL DEFAULT 'Europe/Belgrade',
  currency           CHAR(3) NOT NULL DEFAULT 'RSD',
  locale             TEXT NOT NULL DEFAULT 'sr-Latn',
  prices_include_vat BOOLEAN NOT NULL DEFAULT false,
  settings           JSONB NOT NULL DEFAULT '{}',                -- deljenje, zaokruživanje, tiho vreme...
  plan               TEXT NOT NULL DEFAULT 'start',
  status             TEXT NOT NULL DEFAULT 'active',             -- active | suspended | trial
  deleted_at         TIMESTAMPTZ
);

CREATE TABLE location (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id  UUID NOT NULL REFERENCES tenant(id),
  name       TEXT NOT NULL, code TEXT NOT NULL,                  -- code za numerisanje {LOC}
  address    JSONB, phone TEXT, is_default BOOLEAN NOT NULL DEFAULT false,
  working_hours JSONB,                                           -- {mon:[["08:00","16:00"]],...}
  UNIQUE (tenant_id, code)
);

CREATE TABLE membership (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  role        membership_role NOT NULL,
  custom_role_id UUID REFERENCES custom_role(id),
  display_name TEXT NOT NULL,
  pin_hash    TEXT,                                               -- za kiosk PIN (argon2)
  default_location_id UUID REFERENCES location(id),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  invited_at  TIMESTAMPTZ, accepted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE custom_role (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL,                                    -- npr. {'order.read','order.write','finance.read'}
  UNIQUE (tenant_id, name)
);

CREATE TABLE tenant_feature (
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  feature   TEXT NOT NULL,                                        -- 'dvi','estimates','scheduling','inventory','sef','fiscal',...
  enabled   BOOLEAN NOT NULL DEFAULT false,
  config    JSONB,
  PRIMARY KEY (tenant_id, feature)
);

CREATE TABLE vat_rate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  code TEXT NOT NULL,                                             -- 'S' (20), 'R' (10), 'Z' (0), 'E' (oslobođeno) — oznake iz fiskalizacije
  label TEXT NOT NULL, rate NUMERIC(5,2) NOT NULL,
  valid_from DATE NOT NULL, valid_to DATE,
  is_default_labor BOOLEAN NOT NULL DEFAULT false,
  is_default_parts BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_id, code, valid_from)
);

CREATE TABLE number_sequence (
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  location_id UUID REFERENCES location(id),                      -- NULL = zajednički za tenant
  doc_type    TEXT NOT NULL,                                      -- 'service_order','estimate','invoice','credit_note',...
  period_key  TEXT NOT NULL,                                      -- '2026' ili '' ako nema reseta
  pattern     TEXT NOT NULL,                                      -- '{YYYY}-{SEQ:5}'
  last_value  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, COALESCE(location_id,'00000000-0000-0000-0000-000000000000'::uuid), doc_type, period_key)
);

-- Atomsko dodeljivanje broja (poziva se unutar transakcije kreiranja dokumenta)
CREATE OR REPLACE FUNCTION next_document_number(p_tenant UUID, p_location UUID, p_doc_type TEXT, p_at TIMESTAMPTZ)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_seq BIGINT; v_pattern TEXT; v_period TEXT; v_year TEXT;
BEGIN
  v_year := to_char(p_at AT TIME ZONE 'Europe/Belgrade','YYYY');
  SELECT CASE WHEN pattern LIKE '%{YYYY}%' THEN v_year ELSE '' END INTO v_period
    FROM number_sequence WHERE tenant_id=p_tenant AND doc_type=p_doc_type LIMIT 1;
  INSERT INTO number_sequence (tenant_id, location_id, doc_type, period_key, pattern, last_value)
    VALUES (p_tenant, p_location, p_doc_type, COALESCE(v_period,''), '{YYYY}-{SEQ:5}', 1)
  ON CONFLICT (tenant_id, COALESCE(location_id,'00000000-0000-0000-0000-000000000000'::uuid), doc_type, period_key)
    DO UPDATE SET last_value = number_sequence.last_value + 1
  RETURNING last_value, pattern INTO v_seq, v_pattern;
  RETURN regexp_replace(regexp_replace(v_pattern,'\{YYYY\}',v_year),'\{SEQ(:(\d+))?\}',
         lpad(v_seq::text, COALESCE(NULLIF(substring(v_pattern from '\{SEQ:(\d+)\}'),'')::int,1),'0'));
END $$;
-- Napomena: UPSERT na jednom redu serijalizuje konkurentne pozive (row lock) → bez rupa i duplikata.
```

#### 8.4.2. Klijenti

```sql
CREATE TABLE customer (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenant(id),
  type            customer_type NOT NULL,
  first_name      TEXT, last_name TEXT,                           -- person
  company_name    TEXT, tax_id TEXT, registration_no TEXT, jbkjs TEXT, -- company
  display_name    TEXT GENERATED ALWAYS AS (COALESCE(company_name, trim(COALESCE(first_name,'')||' '||COALESCE(last_name,'')))) STORED,
  email           TEXT,
  address         JSONB,
  preferred_channel message_channel,
  language        TEXT NOT NULL DEFAULT 'sr-Latn',
  payment_terms_days INT NOT NULL DEFAULT 0,
  default_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_fleet        BOOLEAN NOT NULL DEFAULT false,
  internal_notes  TEXT,                                           -- nikad se ne deli
  tags            TEXT[] NOT NULL DEFAULT '{}',
  marketing_opt_out BOOLEAN NOT NULL DEFAULT false,
  merged_into_id  UUID REFERENCES customer(id),
  anonymized_at   TIMESTAMPTZ,
  search_text     TEXT GENERATED ALWAYS AS (lower(unaccent(COALESCE(company_name,'')||' '||COALESCE(first_name,'')||' '||COALESCE(last_name,'')||' '||COALESCE(email,'')))) STORED,
  deleted_at      TIMESTAMPTZ,
  CHECK ((type='person' AND (first_name IS NOT NULL OR last_name IS NOT NULL)) OR (type='company' AND company_name IS NOT NULL))
);
CREATE INDEX customer_search_idx ON customer USING gin (search_text gin_trgm_ops);
CREATE INDEX customer_tenant_idx ON customer (tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE customer_contact (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  name        TEXT,                                               -- kontakt osoba u firmi; NULL za fizičko lice
  role        TEXT,                                               -- 'owner','driver','accounting','fleet_manager'
  phone_e164  TEXT,                                               -- +381641234567
  phone_display TEXT,                                             -- kako je uneto
  email       TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  viber_capable BOOLEAN, whatsapp_capable BOOLEAN,                 -- otkriveno iz isporuka
  CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX customer_contact_phone_idx ON customer_contact (tenant_id, phone_e164);
CREATE UNIQUE INDEX customer_contact_one_primary ON customer_contact (customer_id) WHERE is_primary;
```

#### 8.4.3. Vozila i vlasništvo

```sql
CREATE TABLE vehicle (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id        UUID NOT NULL REFERENCES tenant(id),
  plate_display    TEXT,                                          -- 'BG-123-AB'
  plate_normalized TEXT,                                          -- 'BG123AB' (upper, bez razmaka/crtica, ćirilica→latinica)
  vin              CHAR(17),
  make             TEXT, model TEXT, variant TEXT,
  model_year       SMALLINT, first_registration DATE,
  fuel             fuel_type,
  engine_code TEXT, engine_cc INT, power_kw INT,
  color            TEXT, chassis_no TEXT, engine_no TEXT,
  odometer_last    INT, odometer_unit TEXT NOT NULL DEFAULT 'km',
  odometer_last_at TIMESTAMPTZ,
  registration_expires DATE, inspection_due DATE,
  notes            TEXT,
  profile_attachment_id UUID,                                     -- FK dodat posle attachment
  share_with_future_owners BOOLEAN NOT NULL DEFAULT true,
  is_active        BOOLEAN NOT NULL DEFAULT true,                 -- false = otpisano/prodato van evidencije
  deleted_at       TIMESTAMPTZ,
  CHECK (vin IS NULL OR vin ~ '^[A-HJ-NPR-Z0-9]{17}$')
);
CREATE UNIQUE INDEX vehicle_vin_uq ON vehicle (tenant_id, vin) WHERE vin IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX vehicle_plate_active_uq ON vehicle (tenant_id, plate_normalized) WHERE is_active AND deleted_at IS NULL AND plate_normalized IS NOT NULL;
CREATE INDEX vehicle_plate_trgm ON vehicle USING gin (plate_normalized gin_trgm_ops);
CREATE INDEX vehicle_vin_trgm   ON vehicle USING gin (vin gin_trgm_ops);

CREATE TABLE vehicle_ownership (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id   UUID NOT NULL REFERENCES tenant(id),
  vehicle_id  UUID NOT NULL REFERENCES vehicle(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  valid_from  DATE NOT NULL,
  valid_to    DATE,                                               -- NULL = aktivno
  change_reason TEXT,                                             -- 'sale','company_change','correction'
  validity    DATERANGE GENERATED ALWAYS AS (daterange(valid_from, valid_to, '[)')) STORED,
  EXCLUDE USING gist (vehicle_id WITH =, validity WITH &&)        -- bez preklapanja perioda po vozilu
);
CREATE INDEX vehicle_ownership_customer_idx ON vehicle_ownership (customer_id);

-- Pomoćni view: trenutni vlasnik
CREATE VIEW vehicle_current_owner AS
  SELECT v.id AS vehicle_id, o.customer_id
  FROM vehicle v LEFT JOIN vehicle_ownership o ON o.vehicle_id=v.id AND o.valid_to IS NULL;

CREATE TABLE vehicle_driver (                                      -- dodatni korisnici vozila (flota)
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  vehicle_id UUID NOT NULL REFERENCES vehicle(id),
  contact_id UUID NOT NULL REFERENCES customer_contact(id),
  PRIMARY KEY (vehicle_id, contact_id)
);

CREATE TABLE odometer_reading (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  vehicle_id UUID NOT NULL REFERENCES vehicle(id),
  value INT NOT NULL, read_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,                                           -- 'order_intake','inspection','manual'
  service_order_id UUID
);
```

#### 8.4.4. Zakazivanje

```sql
CREATE TABLE resource (                                           -- dizalica, boks, mehaničar kao resurs
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  location_id UUID REFERENCES location(id),
  name TEXT NOT NULL, kind TEXT NOT NULL,                         -- 'bay','lift','technician'
  membership_id UUID REFERENCES membership(id),                   -- ako je kind='technician'
  capacity INT NOT NULL DEFAULT 1, is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE appointment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  location_id UUID REFERENCES location(id),
  customer_id UUID REFERENCES customer(id),
  vehicle_id  UUID REFERENCES vehicle(id),
  unknown_vehicle JSONB,                                          -- {plate, make, model} ako vozilo još nije u bazi
  resource_id UUID REFERENCES resource(id),
  starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT, notes TEXT,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  service_order_id UUID,                                          -- popunjava se pri prijemu
  source TEXT NOT NULL DEFAULT 'staff',                           -- 'staff','online'
  CHECK (ends_at > starts_at)
);
CREATE INDEX appointment_range_idx ON appointment (tenant_id, starts_at);
```

#### 8.4.5. Servisni nalozi i stavke

```sql
CREATE TABLE tenant_order_status (                                 -- prilagođeni statusi
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  base_status order_status NOT NULL,                              -- sistemski status kojem pripada
  code TEXT NOT NULL, label TEXT NOT NULL, color TEXT,
  sort_order INT NOT NULL, notify_customer BOOLEAN NOT NULL DEFAULT false,
  message_template_id UUID,
  UNIQUE (tenant_id, code)
);

CREATE TABLE service_order (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id         UUID NOT NULL REFERENCES tenant(id),
  location_id       UUID REFERENCES location(id),
  number            TEXT NOT NULL,
  vehicle_id        UUID NOT NULL REFERENCES vehicle(id),
  customer_id       UUID NOT NULL REFERENCES customer(id),        -- klijent u trenutku naloga
  ownership_id      UUID REFERENCES vehicle_ownership(id),
  appointment_id    UUID REFERENCES appointment(id),
  status            order_status NOT NULL DEFAULT 'received',
  custom_status_id  UUID REFERENCES tenant_order_status(id),
  source            order_source NOT NULL DEFAULT 'walk_in',
  priority          order_priority NOT NULL DEFAULT 'normal',
  odometer_in       INT, fuel_level SMALLINT CHECK (fuel_level BETWEEN 0 AND 8),
  reported_issue    TEXT,
  diagnosis         TEXT,
  internal_notes    TEXT,                                         -- nikad se ne deli
  customer_notes    TEXT,                                         -- deli se
  advisor_id        UUID REFERENCES membership(id),
  promised_at       TIMESTAMPTZ,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ, delivered_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ,
  delivered_to      TEXT,
  visible_to_customer BOOLEAN NOT NULL DEFAULT true,
  share_with_future_owners BOOLEAN,                               -- NULL = nasledi od vozila
  claim_of_order_id UUID REFERENCES service_order(id),            -- reklamacija na koji nalog
  tags              TEXT[] NOT NULL DEFAULT '{}',
  -- materijalizovani zbirovi (preračunava servisni sloj/trigger iz order_item)
  subtotal_labor    NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal_parts    NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal_fees     NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total    NUMERIC(14,2) NOT NULL DEFAULT 0,
  order_discount_pct NUMERIC(5,2), order_discount_amount NUMERIC(14,2),
  net_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  gross_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_breakdown     JSONB NOT NULL DEFAULT '[]',                  -- [{code:'S',rate:20,net:…,vat:…}]
  locked_at         TIMESTAMPTZ,                                  -- posle izdatog računa
  deleted_at        TIMESTAMPTZ,
  UNIQUE (tenant_id, number)
);
CREATE INDEX service_order_vehicle_idx   ON service_order (vehicle_id, received_at DESC);
CREATE INDEX service_order_customer_idx  ON service_order (customer_id, received_at DESC);
CREATE INDEX service_order_status_idx    ON service_order (tenant_id, status) WHERE deleted_at IS NULL;

CREATE TABLE order_assignee (
  service_order_id UUID NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES membership(id),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  role TEXT NOT NULL DEFAULT 'technician',
  PRIMARY KEY (service_order_id, membership_id)
);

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  service_order_id UUID NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  from_status order_status, to_status order_status NOT NULL,
  from_custom UUID, to_custom UUID,
  changed_by UUID REFERENCES membership(id), changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT
);

CREATE TABLE order_item_group (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  service_order_id UUID NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  title TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0,
  inspection_result_id UUID                                        -- ako grupa potiče iz DVI stavke
);

CREATE TABLE order_item (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id         UUID NOT NULL REFERENCES tenant(id),
  service_order_id  UUID NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  group_id          UUID REFERENCES order_item_group(id),
  sort_order        INT NOT NULL DEFAULT 0,
  type              item_type NOT NULL,
  source            item_source NOT NULL DEFAULT 'manual',
  estimate_item_id  UUID,
  catalog_item_id   UUID,                                         -- FK posle catalog_item
  name              TEXT NOT NULL, description TEXT,
  part_number       TEXT, oem_number TEXT, supplier_id UUID,
  quantity          NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit              TEXT NOT NULL DEFAULT 'kom',
  hours             NUMERIC(8,2), hourly_rate NUMERIC(14,2),      -- labor
  unit_price_net    NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_cost         NUMERIC(14,2),                                -- nabavna, samo owner/advisor
  discount_pct      NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_rate_id       UUID REFERENCES vat_rate(id),
  vat_rate          NUMERIC(5,2) NOT NULL,                        -- snapshot stope
  line_net          NUMERIC(14,2) NOT NULL DEFAULT 0,             -- izračunato
  line_vat          NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_gross        NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            item_status NOT NULL DEFAULT 'pending',
  not_done_reason   TEXT,
  done_by           UUID REFERENCES membership(id), done_at TIMESTAMPTZ,
  customer_supplied BOOLEAN NOT NULL DEFAULT false,
  warranty_months   INT, warranty_km INT,
  warranty_covered  BOOLEAN NOT NULL DEFAULT false,               -- stavka reklamacije na teret servisa
  supplier_claim_status TEXT,
  visible_to_customer BOOLEAN NOT NULL DEFAULT true,
  is_recommended    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX order_item_order_idx ON order_item (service_order_id, sort_order);
CREATE INDEX order_item_part_idx  ON order_item (tenant_id, part_number) WHERE part_number IS NOT NULL;

CREATE TABLE order_recommendation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  service_order_id UUID NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicle(id),
  title TEXT NOT NULL, description TEXT,
  priority recommendation_priority NOT NULL DEFAULT 'soon',
  estimated_price NUMERIC(14,2),
  due_date DATE, due_odometer INT,
  from_inspection_result_id UUID, from_estimate_item_id UUID,
  resolved_by_order_id UUID REFERENCES service_order(id),         -- kad se uradi
  dismissed_at TIMESTAMPTZ, dismissed_reason TEXT,
  visible_to_customer BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE order_time_entry (                                    -- FR-ORD-007
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  service_order_id UUID NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_item(id),
  membership_id UUID NOT NULL REFERENCES membership(id),
  started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ,
  minutes INT GENERATED ALWAYS AS (CASE WHEN ended_at IS NULL THEN NULL ELSE EXTRACT(EPOCH FROM (ended_at-started_at))::int/60 END) STORED
);
```

#### 8.4.6. Predračuni i odobrenja

```sql
CREATE TABLE estimate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  service_order_id UUID NOT NULL REFERENCES service_order(id),
  number TEXT NOT NULL, version INT NOT NULL DEFAULT 1,
  status estimate_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  sent_at TIMESTAMPTZ, decided_at TIMESTAMPTZ,
  supersedes_id UUID REFERENCES estimate(id),
  approval_mode TEXT NOT NULL DEFAULT 'per_item',                 -- 'per_item' | 'per_group' | 'all'
  notes_for_customer TEXT,
  net_total NUMERIC(14,2) NOT NULL DEFAULT 0, vat_total NUMERIC(14,2) NOT NULL DEFAULT 0, gross_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  pdf_attachment_id UUID,
  UNIQUE (tenant_id, number, version)
);

CREATE TABLE estimate_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  estimate_id UUID NOT NULL REFERENCES estimate(id) ON DELETE CASCADE,
  group_title TEXT, group_sort INT NOT NULL DEFAULT 0, sort_order INT NOT NULL DEFAULT 0,
  inspection_result_id UUID,
  type item_type NOT NULL, catalog_item_id UUID, name TEXT NOT NULL, description TEXT,
  part_number TEXT, quantity NUMERIC(12,3) NOT NULL DEFAULT 1, unit TEXT NOT NULL DEFAULT 'kom',
  unit_price_net NUMERIC(14,2) NOT NULL, discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL, line_net NUMERIC(14,2) NOT NULL, line_vat NUMERIC(14,2) NOT NULL, line_gross NUMERIC(14,2) NOT NULL,
  necessity TEXT NOT NULL DEFAULT 'required',                     -- 'required' | 'recommended'
  decision TEXT,                                                  -- NULL | 'approved' | 'declined'
  decided_at TIMESTAMPTZ
);

CREATE TABLE approval (                                            -- nepromenljiv zapis odluke
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  estimate_id UUID NOT NULL REFERENCES estimate(id),
  method approval_method NOT NULL,
  approved_item_ids UUID[] NOT NULL, declined_item_ids UUID[] NOT NULL,
  signer_name TEXT, signer_ip INET, signer_user_agent TEXT,
  consent_text TEXT NOT NULL, consent_version TEXT NOT NULL,
  recorded_by UUID REFERENCES membership(id),                     -- ako je zaposleni beležio (verbal/phone/in_person)
  note TEXT,
  share_link_id UUID,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 8.4.7. Inspekcija (DVI)

```sql
CREATE TABLE inspection_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name TEXT NOT NULL, description TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
  photo_required_on_red BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE inspection_template_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  template_id UUID NOT NULL REFERENCES inspection_template(id) ON DELETE CASCADE,
  section TEXT NOT NULL, sort_order INT NOT NULL,
  label TEXT NOT NULL, help_text TEXT,
  rating_type rating_type NOT NULL DEFAULT 'traffic_light',
  unit TEXT, threshold_yellow NUMERIC(10,2), threshold_red NUMERIC(10,2), threshold_direction TEXT -- 'below' | 'above'
);
CREATE TABLE inspection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  service_order_id UUID NOT NULL REFERENCES service_order(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicle(id),
  template_id UUID REFERENCES inspection_template(id),
  template_name TEXT NOT NULL,                                    -- snapshot
  performed_by UUID REFERENCES membership(id),
  status inspection_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ,
  odometer INT,
  summary JSONB,                                                  -- {green:18, yellow:4, red:3}
  visible_to_customer BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE inspection_result (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  inspection_id UUID NOT NULL REFERENCES inspection(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES inspection_template_item(id),
  section TEXT NOT NULL, label TEXT NOT NULL, sort_order INT NOT NULL, -- snapshot
  rating_type rating_type NOT NULL,
  rating traffic_light, value_num NUMERIC(10,2), value_bool BOOLEAN, value_text TEXT,
  note_customer TEXT, note_internal TEXT,
  recorded_at TIMESTAMPTZ
);
```

#### 8.4.8. Katalog, paketi, magacin

```sql
CREATE TABLE catalog_category (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  parent_id UUID REFERENCES catalog_category(id), name TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE supplier (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name TEXT NOT NULL, tax_id TEXT, phone TEXT, email TEXT, address JSONB, notes TEXT, is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE catalog_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  type item_type NOT NULL CHECK (type IN ('labor','part','fee')),
  code TEXT, name TEXT NOT NULL, description TEXT,
  category_id UUID REFERENCES catalog_category(id),
  unit TEXT NOT NULL DEFAULT 'kom',
  default_price_net NUMERIC(14,2), price_list JSONB,              -- {standard:…, diagnostics:…}
  default_cost NUMERIC(14,2),
  vat_rate_id UUID REFERENCES vat_rate(id),
  default_minutes INT, warranty_months INT, warranty_km INT,
  part_number TEXT, oem_number TEXT, barcode TEXT, supplier_id UUID REFERENCES supplier(id),
  track_inventory BOOLEAN NOT NULL DEFAULT false,
  min_stock NUMERIC(12,3), bin_location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true, deleted_at TIMESTAMPTZ,
  search_text TEXT GENERATED ALWAYS AS (lower(unaccent(COALESCE(code,'')||' '||name||' '||COALESCE(part_number,'')||' '||COALESCE(oem_number,'')))) STORED
);
CREATE INDEX catalog_item_search_idx ON catalog_item USING gin (search_text gin_trgm_ops);
CREATE UNIQUE INDEX catalog_item_code_uq ON catalog_item (tenant_id, code) WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE catalog_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  catalog_item_id UUID NOT NULL REFERENCES catalog_item(id) ON DELETE CASCADE,
  old_price NUMERIC(14,2), new_price NUMERIC(14,2), changed_by UUID, changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_package (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  name TEXT NOT NULL, description TEXT, vehicle_filter JSONB,     -- {make:'VW', engine_code:'…'}
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE service_package_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  package_id UUID NOT NULL REFERENCES service_package(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog_item(id),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0, price_override_net NUMERIC(14,2)
);

CREATE TABLE inventory_stock (
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  location_id UUID NOT NULL REFERENCES location(id),
  catalog_item_id UUID NOT NULL REFERENCES catalog_item(id),
  on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
  reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(14,4), last_cost NUMERIC(14,2),
  PRIMARY KEY (location_id, catalog_item_id)
);
CREATE TABLE inventory_movement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  location_id UUID NOT NULL REFERENCES location(id),
  catalog_item_id UUID NOT NULL REFERENCES catalog_item(id),
  type movement_type NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,                                -- pozitivno ulaz, negativno izlaz
  unit_cost NUMERIC(14,2),
  reference_type TEXT, reference_id UUID,                         -- 'service_order','goods_receipt','stocktake'
  note TEXT, performed_by UUID REFERENCES membership(id), performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movement_item_idx ON inventory_movement (catalog_item_id, performed_at DESC);

CREATE TABLE goods_receipt (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  location_id UUID NOT NULL REFERENCES location(id),
  supplier_id UUID REFERENCES supplier(id),
  supplier_invoice_no TEXT, received_at DATE NOT NULL, notes TEXT, total_cost NUMERIC(14,2)
);
CREATE TABLE goods_receipt_line (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipt(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog_item(id),
  quantity NUMERIC(12,3) NOT NULL, unit_cost NUMERIC(14,2) NOT NULL
);
```

#### 8.4.9. Računi, uplate

```sql
CREATE TABLE invoice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  location_id UUID REFERENCES location(id),
  type invoice_type NOT NULL,
  number TEXT NOT NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  customer_id UUID NOT NULL REFERENCES customer(id),
  customer_snapshot JSONB NOT NULL,                               -- naziv, adresa, PIB, MB u trenutku izdavanja
  tenant_snapshot JSONB NOT NULL,
  issued_at TIMESTAMPTZ, supply_date DATE, due_date DATE,
  payment_reference TEXT,                                         -- poziv na broj (model 97)
  currency CHAR(3) NOT NULL,
  net_total NUMERIC(14,2) NOT NULL DEFAULT 0, vat_total NUMERIC(14,2) NOT NULL DEFAULT 0, gross_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_breakdown JSONB NOT NULL DEFAULT '[]',
  advance_applied NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_total NUMERIC(14,2) NOT NULL DEFAULT 0,                    -- materijalizovano iz payment_allocation
  credit_note_for_id UUID REFERENCES invoice(id),
  cancelled_by_id UUID REFERENCES invoice(id),
  notes TEXT, footer_text TEXT,
  pdf_attachment_id UUID,
  -- fiskalizacija (P2)
  fiscal_request JSONB, fiscal_response JSONB, fiscal_invoice_number TEXT, fiscal_verification_url TEXT, fiscal_journal TEXT,
  -- SEF (P2)
  sef_id TEXT, sef_status TEXT, sef_sent_at TIMESTAMPTZ, sef_xml_attachment_id UUID, sef_error TEXT,
  UNIQUE (tenant_id, type, number)
);
CREATE INDEX invoice_customer_idx ON invoice (customer_id, issued_at DESC);
CREATE INDEX invoice_open_idx ON invoice (tenant_id, status) WHERE status IN ('issued','partially_paid','overdue');

CREATE TABLE invoice_line (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES service_order(id),             -- zbirna faktura: više naloga
  order_item_id UUID REFERENCES order_item(id),
  sort_order INT NOT NULL,
  type item_type NOT NULL, name TEXT NOT NULL, description TEXT, part_number TEXT,
  quantity NUMERIC(12,3) NOT NULL, unit TEXT NOT NULL,
  unit_price_net NUMERIC(14,2) NOT NULL, discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0, discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_code TEXT NOT NULL, vat_rate NUMERIC(5,2) NOT NULL,
  line_net NUMERIC(14,2) NOT NULL, line_vat NUMERIC(14,2) NOT NULL, line_gross NUMERIC(14,2) NOT NULL
);

-- Nepromenljivost izdatih računa
CREATE OR REPLACE FUNCTION invoice_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' AND (
       NEW.net_total IS DISTINCT FROM OLD.net_total OR NEW.vat_total IS DISTINCT FROM OLD.vat_total
    OR NEW.gross_total IS DISTINCT FROM OLD.gross_total OR NEW.customer_snapshot IS DISTINCT FROM OLD.customer_snapshot
    OR NEW.number IS DISTINCT FROM OLD.number OR NEW.issued_at IS DISTINCT FROM OLD.issued_at) THEN
    RAISE EXCEPTION 'issued invoice is immutable' USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_immutable_trg BEFORE UPDATE ON invoice FOR EACH ROW EXECUTE FUNCTION invoice_immutable();

CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  location_id UUID REFERENCES location(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  amount NUMERIC(14,2) NOT NULL,                                  -- negativno = storno/povraćaj
  method payment_method NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference TEXT, note TEXT,
  reverses_payment_id UUID REFERENCES payment(id),
  recorded_by UUID REFERENCES membership(id),
  psp_transaction_id TEXT                                         -- online plaćanje (P2)
);
CREATE INDEX payment_customer_idx ON payment (customer_id, paid_at DESC);

CREATE TABLE payment_allocation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  payment_id UUID NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoice(id),
  service_order_id UUID REFERENCES service_order(id),             -- P0 bez računa: raspored na nalog
  amount NUMERIC(14,2) NOT NULL CHECK (amount <> 0),
  CHECK (invoice_id IS NOT NULL OR service_order_id IS NOT NULL)
);
-- Pravilo (servisni sloj + constraint trigger): SUM(allocation.amount) po payment-u ≤ payment.amount; ostatak = avans klijenta.
```

#### 8.4.10. Prilozi, deljivi linkovi

```sql
CREATE TABLE attachment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  entity_type TEXT NOT NULL,                                      -- 'service_order','order_item','inspection_result','vehicle','customer','invoice','goods_receipt','estimate'
  entity_id UUID NOT NULL,
  service_order_id UUID REFERENCES service_order(id),             -- denormalizovano za brz upit "svi prilozi naloga"
  vehicle_id UUID REFERENCES vehicle(id),                         -- denormalizovano za galeriju vozila
  category attachment_category NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,                                     -- 'tenants/{tenant}/orders/{order}/{uuid}.jpg'
  variants JSONB,                                                 -- {thumb:'…',medium:'…'}
  mime_type TEXT NOT NULL, size_bytes BIGINT NOT NULL,
  width INT, height INT, duration_s INT,
  sha256 TEXT,
  title TEXT, note TEXT, sort_order INT NOT NULL DEFAULT 0,
  annotations JSONB,                                              -- DVI anotacije
  visible_to_customer BOOLEAN NOT NULL DEFAULT false,
  scan_status TEXT NOT NULL DEFAULT 'clean',                      -- 'pending','clean','infected'
  uploaded_by UUID REFERENCES membership(id),
  deleted_at TIMESTAMPTZ, purge_after TIMESTAMPTZ
);
CREATE INDEX attachment_entity_idx ON attachment (entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX attachment_order_idx  ON attachment (service_order_id) WHERE deleted_at IS NULL;
CREATE INDEX attachment_vehicle_idx ON attachment (vehicle_id, created_at DESC) WHERE deleted_at IS NULL;
ALTER TABLE vehicle ADD CONSTRAINT vehicle_profile_fk FOREIGN KEY (profile_attachment_id) REFERENCES attachment(id);

CREATE TABLE share_link (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  type share_link_type NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,                                -- sha256(token); token se ne čuva
  token_prefix TEXT NOT NULL,                                     -- prvih 6 znakova za prikaz "k/AbC12x…"
  vehicle_id UUID REFERENCES vehicle(id),
  ownership_id UUID REFERENCES vehicle_ownership(id),             -- karton važi za ovaj period vlasništva
  service_order_id UUID REFERENCES service_order(id),
  estimate_id UUID REFERENCES estimate(id),
  inspection_id UUID REFERENCES inspection(id),
  appointment_id UUID REFERENCES appointment(id),
  customer_id UUID REFERENCES customer(id),
  status share_link_status NOT NULL DEFAULT 'active',
  pin_hash TEXT, pin_failed_count INT NOT NULL DEFAULT 0, pin_locked_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, max_opens INT,
  open_count INT NOT NULL DEFAULT 0, last_opened_at TIMESTAMPTZ,
  show_prices BOOLEAN, show_technician BOOLEAN,                   -- NULL = podrazumevano tenanta
  revoked_at TIMESTAMPTZ, revoked_by UUID, revoke_reason TEXT
);
CREATE INDEX share_link_vehicle_idx ON share_link (vehicle_id) WHERE status='active';

CREATE TABLE share_link_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  share_link_id UUID NOT NULL REFERENCES share_link(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_trunc TEXT,                                                  -- /24 za IPv4, /48 za IPv6
  user_agent TEXT, action TEXT NOT NULL DEFAULT 'view',           -- 'view','pin_fail','pdf','approve'
  purge_after TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 days'
);
```

#### 8.4.11. Poruke, podsetnici, pristanci, audit

```sql
CREATE TABLE message_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  event TEXT NOT NULL,                                            -- 'order_received','estimate_sent','vehicle_ready',...
  channel message_channel NOT NULL, language TEXT NOT NULL DEFAULT 'sr-Latn',
  subject TEXT, body TEXT NOT NULL, version INT NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true, is_marketing BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_id, event, channel, language)
);
CREATE TABLE message (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  direction message_direction NOT NULL DEFAULT 'outbound',
  channel message_channel NOT NULL,
  customer_id UUID REFERENCES customer(id), contact_id UUID REFERENCES customer_contact(id),
  to_address TEXT NOT NULL,                                       -- E.164 ili email
  template_id UUID REFERENCES message_template(id), template_version INT,
  subject TEXT, body TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'queued',
  provider TEXT, provider_message_id TEXT, provider_cost NUMERIC(10,4), error TEXT,
  fallback_of_id UUID REFERENCES message(id),                     -- SMS poslat kao fallback za Viber
  service_order_id UUID, estimate_id UUID, appointment_id UUID, reminder_id UUID, share_link_id UUID,
  sent_by UUID REFERENCES membership(id),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(), sent_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, read_at TIMESTAMPTZ,
  purge_after TIMESTAMPTZ
);
CREATE INDEX message_customer_idx ON message (customer_id, queued_at DESC);
CREATE INDEX message_queue_idx ON message (status) WHERE status='queued';

CREATE TABLE reminder (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  kind reminder_kind NOT NULL,
  customer_id UUID NOT NULL REFERENCES customer(id),
  vehicle_id UUID REFERENCES vehicle(id),
  service_order_id UUID, recommendation_id UUID, appointment_id UUID, estimate_id UUID, invoice_id UUID,
  due_date DATE, due_odometer INT,
  send_at TIMESTAMPTZ NOT NULL,                                   -- izračunato: due_date − lead_days
  status reminder_status NOT NULL DEFAULT 'scheduled',
  attempts INT NOT NULL DEFAULT 0, last_message_id UUID
);
CREATE INDEX reminder_due_idx ON reminder (send_at) WHERE status='scheduled';

CREATE TABLE consent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  tenant_id UUID NOT NULL REFERENCES tenant(id),
  customer_id UUID NOT NULL REFERENCES customer(id),
  purpose consent_purpose NOT NULL,
  granted BOOLEAN NOT NULL, source TEXT NOT NULL,                 -- 'verbal','form','link','import'
  text_version TEXT, recorded_by UUID, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  actor_user_id UUID, actor_membership_id UUID, actor_label TEXT,  -- label za sistemske/javne aktere ('system','public:share_link')
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL, entity_id UUID,
  diff JSONB,                                                     -- {field:{old,new}} sa maskiranjem osetljivih
  ip INET, user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log (tenant_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_log_time_idx ON audit_log (tenant_id, occurred_at DESC);
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;                   -- append-only; zadržavanje kroz particionisanje po mesecu (P1)
```

### 8.5. Row-Level Security (RLS)

Sve poslovne tabele imaju `ENABLE ROW LEVEL SECURITY` i politike po istom obrascu. Aktivni tenant se prenosi kroz JWT claim `tenant_id` (Supabase custom claim postavljen pri izboru tenanta) ili kroz `set_config('app.tenant_id', …)` u serverskom kodu.

```sql
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.tenant_id', true), '')::uuid,
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
$$;

CREATE OR REPLACE FUNCTION current_membership() RETURNS membership LANGUAGE sql STABLE AS $$
  SELECT m.* FROM membership m WHERE m.tenant_id = current_tenant_id() AND m.user_id = auth.uid() AND m.is_active
$$;

CREATE OR REPLACE FUNCTION has_permission(p TEXT) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT CASE (SELECT role FROM current_membership())
    WHEN 'owner' THEN true
    WHEN 'advisor' THEN p NOT IN ('tenant.settings','finance.margin','member.manage','data.delete')
    WHEN 'technician' THEN p IN ('order.read','order.write_items','order.status','attachment.write','vehicle.read','customer.read_basic','inspection.write')
    WHEN 'accountant' THEN p IN ('finance.read','invoice.read','payment.read','report.finance','export.finance')
    WHEN 'custom' THEN p = ANY ((SELECT cr.permissions FROM custom_role cr WHERE cr.id = (SELECT custom_role_id FROM current_membership())))
    ELSE false END
$$;

-- Obrazac politika (primer za service_order)
ALTER TABLE service_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY so_tenant_isolation ON service_order
  USING (tenant_id = current_tenant_id());
CREATE POLICY so_read ON service_order FOR SELECT
  USING (tenant_id = current_tenant_id() AND has_permission('order.read'));
CREATE POLICY so_write ON service_order FOR UPDATE
  USING (tenant_id = current_tenant_id() AND has_permission('order.write'))
  WITH CHECK (tenant_id = current_tenant_id());
-- Kolone sa nabavnim cenama/maržom: ne RLS nego VIEW `order_item_public` bez `unit_cost`, koji koriste uloge bez 'finance.margin';
-- API sloj bira view ili tabelu po dozvoli.

-- Javne strane (deljivi linkovi) NE koriste korisnički JWT: server-side ruta validira token (heš), proverava status/PIN/istek,
-- i čita podatke kroz SECURITY DEFINER funkcije koje vraćaju samo dozvoljena polja (8.6).
```

### 8.6. Funkcije za javni prikaz (deljivi link)

```sql
-- Vraća karton za token; svaka kolona je eksplicitno izabrana (whitelist), nikad SELECT *
CREATE OR REPLACE FUNCTION public_vehicle_card(p_token_hash TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l share_link; t tenant; v vehicle; result JSONB;
BEGIN
  SELECT * INTO l FROM share_link WHERE token_hash = p_token_hash AND type='vehicle_card';
  IF NOT FOUND OR l.status <> 'active' OR (l.expires_at IS NOT NULL AND l.expires_at < now())
     OR (l.max_opens IS NOT NULL AND l.open_count >= l.max_opens) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO t FROM tenant WHERE id = l.tenant_id;
  SELECT * INTO v FROM vehicle WHERE id = l.vehicle_id;
  result := jsonb_build_object(
    'shop', jsonb_build_object('name', t.name, 'phone', t.phone, 'logo', t.logo_path, 'address', t.address),
    'vehicle', jsonb_build_object('make', v.make, 'model', v.model, 'year', v.model_year,
                                  'plate', CASE WHEN (t.settings->>'mask_plate')::bool THEN mask_plate(v.plate_display) ELSE v.plate_display END,
                                  'odometer', v.odometer_last),
    'orders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'number', o.number, 'date', o.completed_at, 'odometer', o.odometer_in, 'status', o.status,
        'customer_notes', o.customer_notes,
        'items', (SELECT jsonb_agg(jsonb_build_object('type', i.type, 'name', i.name, 'qty', i.quantity, 'unit', i.unit,
                    'gross', CASE WHEN COALESCE(l.show_prices,(t.settings->>'show_prices')::bool) AND o.ownership_id = l.ownership_id THEN i.line_gross END,
                    'warranty_until', CASE WHEN o.ownership_id = l.ownership_id THEN o.completed_at + make_interval(months => i.warranty_months) END)
                    ORDER BY i.sort_order)
                  FROM order_item i WHERE i.service_order_id=o.id AND i.visible_to_customer AND i.type <> 'note'),
        'total', CASE WHEN COALESCE(l.show_prices,(t.settings->>'show_prices')::bool) AND o.ownership_id = l.ownership_id THEN o.gross_total END,
        'photos', (SELECT jsonb_agg(jsonb_build_object('id', a.id, 'category', a.category, 'title', a.title) ORDER BY a.sort_order)
                   FROM attachment a WHERE a.service_order_id=o.id AND a.visible_to_customer AND a.deleted_at IS NULL AND a.mime_type LIKE 'image/%'),
        'recommendations', (SELECT jsonb_agg(jsonb_build_object('title', r.title, 'priority', r.priority, 'due_date', r.due_date, 'due_odometer', r.due_odometer))
                            FROM order_recommendation r WHERE r.service_order_id=o.id AND r.visible_to_customer AND r.resolved_by_order_id IS NULL AND r.dismissed_at IS NULL)
      ) ORDER BY o.completed_at DESC), '[]'::jsonb)
      FROM service_order o
      WHERE o.vehicle_id = l.vehicle_id AND o.visible_to_customer AND o.deleted_at IS NULL
        AND o.status IN ('completed','delivered')
        AND (o.ownership_id = l.ownership_id                                  -- tekući vlasnik: sve vidljivo
             OR (v.share_with_future_owners AND COALESCE(o.share_with_future_owners, true)))   -- ranije: tehnička istorija
    )
  );
  UPDATE share_link SET open_count = open_count + 1, last_opened_at = now() WHERE id = l.id;
  RETURN result;
END $$;
-- Napomena: za naloge ranijih vlasnika funkcija namerno NE vraća cene, garancije, customer_notes (dodati filter u implementaciji), ni bilo šta o klijentu.
```

### 8.7. Materijalizacija zbirova

Zbirovi na `service_order`, `estimate`, `invoice` se preračunavaju u servisnom sloju u istoj transakciji kao izmena stavki (jednostavnije za testiranje nego trigeri), uz **constraint trigger** koji na kraju transakcije proverava da `gross_total = SUM(line_gross)`; neslaganje → rollback. Time se dobija i brzina (čitanje bez agregacije) i garancija konzistentnosti.

### 8.8. Migracije i seed

- Alat: Supabase CLI migracije (SQL fajlovi, verzionisani u repou), `supabase db diff` zabranjeno u produkciji — migracije se pišu ručno i pregledaju.
- Seed za novi tenant: podrazumevane stope PDV-a, statusi, 3 šablona inspekcije, 10 šablona poruka, kategorije kataloga, 20 čestih usluga (bez cena), podrazumevane garancije.
- Test seed: 2 tenanta, 50 klijenata, 80 vozila, 300 naloga sa stavkama, uplatama i prilozima (generisane slike), da bi se testirala izolacija i performanse.

---
## 9. Arhitektura sistema

### 9.1. Pregled

```
┌─────────────────────────────── Klijenti ───────────────────────────────┐
│  Desktop browser (pult)   Telefon/tablet PWA (radionica)   Javna strana (klijent, bez prijave)  │
└──────────────┬───────────────────────────┬─────────────────────────────┬────────────┘
               │ HTTPS                     │                             │
┌──────────────▼───────────────────────────▼─────────────────────────────▼────────────┐
│  Next.js 15 (App Router) na Vercel-u                                                  │
│  • React Server Components za liste/prikaze   • Server Actions za mutacije            │
│  • Route Handlers: /api/public/*, /api/webhooks/*, /api/v1/* (P2 javni API)           │
│  • Middleware: tenant resolve, auth, rate limit, CSP                                  │
│  • PDF renderer (serverless, Playwright/Chromium ili @react-pdf) — ili zaseban servis  │
└──────────────┬────────────────────────────────────────┬─────────────────────────────┘
               │ supabase-js (anon + RLS) / service role │ Jobs (QStash / Supabase cron + Edge Functions)
┌──────────────▼───────────────────┐   ┌──────────────▼──────────────────────────────┐
│  Supabase                         │   │  Pozadinski poslovi                           │
│  • Postgres 16 + RLS + pg_trgm    │   │  • slanje poruka (red), Viber→SMS fallback     │
│  • Auth (email, magic link, TOTP) │   │  • podsetnici (noćni), isteci linkova          │
│  • Storage (privatni bucket-i)    │   │  • generisanje varijanti slika, PDF            │
│  • Realtime (Kanban, notifikacije)│   │  • politika zadržavanja, izvoz tenanta         │
│  • Edge Functions (webhook-ovi)   │   │  • SEF/PFR sinhronizacija (P2)                 │
└──────────────┬───────────────────┘   └──────────────┬──────────────────────────────┘
               │                                       │
┌──────────────▼───────────────────────────────────────▼──────────────────────────────┐
│  Eksterni servisi: SMS/Viber provajder · Email (Resend/Postmark) · VIN dekoder ·      │
│  SEF API · LPFR (lokalna mreža servisa) / VPFR · PSP (P2) · Sentry · PostHog/Plausible │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

**Zašto ovaj stek** (odluka, ne diskusija): jedan jezik (TypeScript) kroz ceo sistem, Postgres sa RLS-om kao druga linija odbrane multi-tenancy-ja, Supabase pokriva auth/storage/realtime bez sopstvene infrastrukture, Vercel daje preview deploy po PR-u. Region: Supabase **EU (Frankfurt)**, Vercel funkcije `fra1`. Ako Supabase postane ograničenje (cena skladišta, LPFR pristup), slojevi su odvojeni tako da se Storage može zameniti S3-kompatibilnim (Cloudflare R2), a Postgres je Postgres.

### 9.2. Multi-tenancy

| Sloj | Mehanizam |
|---|---|
| URL | `app.example.com` (tenant iz sesije) — ne poddomeni, da bi PWA i cookie radili jednostavno; javne strane `app.example.com/k/<token>` i `app.example.com/s/<tenant-slug>/zakazivanje` (P2). |
| Sesija | Supabase JWT + `app_metadata.tenant_id` (postavlja se serverskom funkcijom pri izboru tenanta; refresh tokena ga ažurira). |
| Baza | RLS na svakoj tabeli (8.5). Serverski kod koji koristi `service_role` ključ MORA pozvati `set_config('app.tenant_id', …)` i koristiti se samo u pozadinskim poslovima i javnim rutama. |
| Skladište | Putanja `tenants/{tenant_id}/…`; Storage politike dozvoljavaju čitanje samo kroz potpisane URL-ove koje izdaje server posle provere dozvola. |
| Keš | Ključevi prefiksirani `t:{tenant_id}:`. |
| Testovi | Integracioni test „cross-tenant“: korisnik tenanta A pokušava svaki endpoint sa ID-jevima tenanta B → 404 (ne 403, da se ne otkriva postojanje). |

### 9.3. Slojevi koda (monorepo)

```
apps/web                 Next.js aplikacija (interni UI + javne strane)
packages/db              migracije, generisani tipovi (supabase gen types), seed
packages/domain          čista poslovna logika bez I/O: obračun cena/PDV-a, mašina stanja, raspored uplata,
                         normalizacija tablica/telefona, validacija VIN-a — 100 % unit testirano
packages/api             servisni sloj: use-case funkcije (createOrder, approveEstimate…) koje koriste domain + db;
                         jedine tačke koje pišu u bazu; svaka upisuje audit
packages/ui              deljene React komponente (design system), Storybook
packages/pdf             šabloni dokumenata (React → HTML → PDF)
packages/messaging       adapteri kanala (viber, sms, email) iza zajedničkog interfejsa
packages/integrations    vin-decoder, sef, fiscal (esir), psp — svaki iza interfejsa sa mock implementacijom
```

Pravilo: UI nikad ne poziva bazu direktno za mutacije; samo kroz `packages/api` (Server Actions su tanki omotači). Čitanja mogu ići direktno kroz RLS za liste/prikaze.

### 9.4. API

#### 9.4.1. Interni (Server Actions / Route Handlers) — konvencije

- Ulaz validiran `zod` šemom; izlaz tipiziran; greške kao `{ code, message, details? }` sa HTTP kodovima: `400` validacija, `401` nije prijavljen, `403` nema dozvolu (samo unutar tenanta), `404` ne postoji ili tuđi tenant, `409` konflikt stanja (nedozvoljen prelaz, zaključan nalog, duplikat broja), `422` poslovno pravilo, `429` rate limit.
- Idempotentnost mutacija koje klijent može ponoviti (offline red): zaglavlje `Idempotency-Key` (UUID), čuva se 24 h u tabeli `idempotency_key (tenant_id, key, response_hash)`.
- Paginacija kursorom (`?cursor=&limit=`), sortiranje eksplicitno, filteri kao query parametri; maksimum 100 po strani.

#### 9.4.2. Lista use-case operacija (packages/api)

| Grupa | Operacije |
|---|---|
| auth | `acceptInvite`, `switchTenant`, `setKioskPin`, `verifyKioskPin` |
| tenant | `updateTenant`, `updateNumbering`, `upsertVatRate`, `upsertOrderStatuses`, `updateShareDefaults`, `upsertMessageTemplate`, `setFeature` |
| members | `inviteMember`, `updateMemberRole`, `deactivateMember`, `upsertCustomRole` |
| customers | `createCustomer`, `updateCustomer`, `archiveCustomer`, `mergeCustomers`, `addContact`, `updateContact`, `recordConsent`, `anonymizeCustomer`, `exportCustomerData` |
| vehicles | `createVehicle`, `updateVehicle`, `changeOwner`, `correctOwnership`, `addDriver`, `decodeVin`, `recordOdometer`, `generateQrLabel` |
| appointments | `createAppointment`, `rescheduleAppointment`, `setAppointmentStatus`, `convertToOrder` |
| orders | `createOrder`, `updateOrder`, `changeStatus`, `assign`, `addItem`, `updateItem`, `reorderItems`, `setItemStatus`, `addPackage`, `cloneOrder`, `addRecommendation`, `resolveRecommendation`, `startTimer`, `stopTimer`, `lockOrder` |
| estimates | `createEstimate`, `updateEstimateItems`, `sendEstimate`, `recordApproval` (link ili manual), `superSedeEstimate`, `expireEstimates` (job) |
| inspections | `startInspection`, `recordResult`, `completeInspection`, `upsertTemplate` |
| catalog | `upsertCatalogItem`, `importCatalog`, `upsertPackage`, `upsertSupplier` |
| inventory | `receiveGoods`, `adjustStock`, `startStocktake`, `finalizeStocktake`, `reserveForOrder`, `consumeForOrder` |
| finance | `issueInvoice` (tip), `issueCreditNote`, `issueSummaryInvoice`, `recordPayment` (sa rasporedom), `reversePayment`, `reallocatePayment`, `sendFiscal` (P2), `sendToSef` (P2), `exportAccounting` |
| attachments | `createUploadIntent` (vraća potpisani upload URL i attachment id), `finalizeAttachment`, `updateAttachment`, `deleteAttachment`, `getSignedUrl` |
| share | `createShareLink`, `revokeShareLink`, `listShareLinks`, `getPublicCard` (public), `getPublicEstimate` (public), `submitApproval` (public), `verifyPin` (public) |
| messaging | `sendMessage`, `previewTemplate`, `handleInboundWebhook`, `handleDeliveryWebhook` |
| reminders | `scheduleReminder`, `cancelReminder`, `processDueReminders` (job) |
| reports | `revenueReport`, `marginReport`, `productivityReport`, `collectionsReport`, `customersReport`, `vatReport`, `dashboardSummary` |
| admin | `exportTenantData`, `applyRetentionPolicy` (job), `auditQuery` |

#### 9.4.3. Javne rute (bez prijave)

| Ruta | Metod | Opis | Zaštita |
|---|---|---|---|
| `/k/[token]` | GET (RSC) | Karton / nalog / predračun / inspekcija / termin po tipu linka | heš tokena, status, istek, PIN; rate limit 30/min po IP, 120/h po tokenu; `noindex` |
| `/api/public/share/[token]/pin` | POST | Provera PIN-a → postavlja httpOnly cookie za taj token (1 h) | 5 pokušaja → blokada 1 h |
| `/api/public/share/[token]/pdf` | GET | PDF kartona/predračuna | isto kao GET |
| `/api/public/share/[token]/approve` | POST | Odobrenje predračuna (stavke, ime, saglasnost) | isto + idempotentno po estimate verziji |
| `/api/public/share/[token]/media/[id]` | GET | Proxy ili redirect na potpisani URL priloga, samo ako prilog pripada linku i vidljiv je | isto |
| `/api/public/appointment/[token]/confirm` | POST | Potvrda/otkazivanje termina | isto |
| `/api/webhooks/messaging/[provider]` | POST | Statusi isporuke i ulazne poruke | HMAC potpis provajdera |
| `/api/webhooks/psp` | POST | Potvrda plaćanja (P2) | potpis PSP-a |
| `/api/webhooks/sef` | POST | Promene statusa e-fakture (P2) | IP allowlist + tajna |

### 9.5. Autentifikacija i autorizacija

- Supabase Auth: email+lozinka (min. 10 znakova, provera protiv liste procurelih — HIBP k-anonimnost), magic link, TOTP (P1). Sesija u httpOnly cookie-ju (`@supabase/ssr`).
- Autorizacija na tri mesta: (1) RLS u bazi, (2) `has_permission` provera u `packages/api` pre svake mutacije, (3) UI skriva nedostupno. (1) i (2) su obavezne, (3) je kozmetika.
- Kiosk režim (FR-AUTH-008): zaseban `membership` tipa `kiosk` sa dugotrajnom sesijom na uređaju; svaka mutacija nosi `acting_membership_id` verifikovan PIN-om u poslednjih 5 min; audit beleži stvarnog izvršioca.
- Javne rute nemaju korisnički kontekst; koriste `service_role` + `SECURITY DEFINER` funkcije sa whitelist kolonama (8.6).

### 9.6. Fajlovi: upload pipeline

```
Telefon/desktop                       Server (Next.js)                         Supabase Storage / job
──────────────                        ────────────────                         ──────────────────────
1. izbor/kamera → canvas resize,      
   EXIF orient., strip GPS, JPEG 82   
2. POST createUploadIntent ───────►   proveri dozvolu, kreiraj attachment     
   {order_id, category, mime, size}   (scan_status='pending' ako nije slika),  
                                      vrati signed upload URL + attachment_id  
3. PUT fajl na signed URL ────────────────────────────────────────────────►   bucket 'attachments' (privatan)
4. POST finalizeAttachment ───────►   proveri da objekat postoji, upiši size,  
                                      sha256, enqueue 'make-variants'  ───────►  job: thumb 320, medium 1024 (sharp), upis variants
5. UI prikazuje thumb preko           GET getSignedUrl(attachment_id, variant) → potpisani URL 15 min
   potpisanog URL-a (keš 10 min)
```

- Bucket-i: `attachments` (prilozi), `documents` (generisani PDF-ovi), `exports` (ZIP izvozi, TTL 24 h), `logos` (javno čitljiv samo preko potpisanih URL-ova sa dugim rokom).
- Limiti: slika ≤ 15 MB pre obrade (posle obrade ≤ 1 MB), PDF ≤ 25 MB, video ≤ 100 MB (P2), ukupno po tenantu po planu.
- Offline red (P1): IndexedDB (`idb`) čuva fajl + metapodatke + Idempotency-Key; Service Worker `Background Sync` ili periodični pokušaj pri `online` događaju; redosled po vremenu; UI badž.

### 9.7. Deljivi linkovi: bezbednosni dizajn

| Aspekt | Odluka |
|---|---|
| Token | 24 bajta iz `crypto.getRandomValues` → base64url (32 znaka). U bazi samo SHA-256 heš. Poređenje konstantnog vremena nije potrebno (heš lookup), ali ruta ne sme razlikovati „ne postoji“ od „opozvan“ u vremenu odgovora (oba vraćaju istu stranicu). |
| PIN | argon2id heš; po uspehu cookie `sl_<prefix>` (httpOnly, SameSite=Lax, 1 h); brojač neuspeha i zaključavanje u bazi (ne u memoriji — serverless). |
| Istek | `expires_at` po podešavanju; job jednom dnevno prebacuje u `expired`. |
| Opoziv | status `revoked` → trenutan efekat (nema keša javne strane duže od 60 s; `Cache-Control: private, max-age=60`). |
| Enumeracija | Nema listanja; 404 stranica identična za nepostojeći i opozvan token; rate limit po IP-u (Upstash/Vercel KV). |
| Medija | Nikad direktni Storage URL u HTML-u; `/api/public/share/[token]/media/[id]` proverava pripadnost priloga linku pa izdaje redirect na potpisani URL (60 min). |
| Promena vlasnika | Transakcija `changeOwner` opoziva sve `vehicle_card` linkove sa starim `ownership_id`. |
| Logovanje | `share_link_access` sa skraćenim IP-om; čuva se 90 dana. |

### 9.8. Pozadinski poslovi

| Posao | Okidač | Opis | Idempotentnost |
|---|---|---|---|
| `send-message` | red (enqueue pri kreiranju `message`) | Poziva adapter kanala; ažurira status; pri `failed`/timeout Viber-a zakazuje SMS fallback | po `message.id` |
| `message-fallback-check` | odloženo X min posle Viber slanja | Ako nije `delivered` → kreira SMS `message` sa `fallback_of_id` | jednom po poruci |
| `process-reminders` | cron 07:30 i 16:30 lokalno | Bira `reminder` sa `send_at <= now()` i `scheduled`, poštuje tiho vreme, kreira poruke, ažurira status | zaključavanje reda (`FOR UPDATE SKIP LOCKED`) |
| `expire-estimates`, `expire-share-links` | cron 00:10 | Statusi `expired` | — |
| `make-variants` | posle uploada | sharp: thumb/medium; upis `variants` | po attachment id |
| `render-pdf` | pri izdavanju dokumenta / na zahtev | HTML → PDF; upis u `documents` bucket, `pdf_attachment_id` | po dokumentu i verziji šablona |
| `retention-policy` | cron 02:00 | Briše po FR-GDPR-003; upisuje sažetak u audit | — |
| `tenant-export` | na zahtev | CSV po tabeli + prilozi → ZIP u `exports`; email sa linkom | po zahtevu |
| `sef-sync`, `fiscal-retry` (P2) | cron 15 min | Statusi iz SEF-a; ponovni pokušaj fiskalizacije ako je PFR bio nedostupan | po dokumentu |
| `purge-attachments` | cron 03:00 | Trajno briše priloge sa `purge_after < now()` | — |

Implementacija: Supabase `pg_cron` + Edge Functions ili Vercel Cron + QStash za redove. Svaki posao piše u tabelu `job_run (name, started_at, finished_at, status, stats, error)` za nadzor.

### 9.9. Integracije

| Integracija | Faza | Interfejs | Napomene |
|---|---|---|---|
| **SMS** | P1 | `MessagingAdapter.send({to, body}) → {providerId}` + webhook statusa | Lokalni provajder sa pokrivenošću Srbije i registrovanim pošiljaocem (alfanumerički sender ID). Cena po segmentu; GSM-7 vs UCS-2 (ćirilica/dijakritici skraćuju segment na 70 znakova — šabloni to proveravaju). |
| **Viber Business Messages** | P1 | isti interfejs | Zahteva registraciju poslovnog naloga i odobrene šablone za transakcione poruke; isporuka se potvrđuje webhookom; fallback na SMS. |
| **WhatsApp Business API** | P2 | isti interfejs | Preko BSP-a; šabloni se odobravaju; 24 h prozor za slobodne odgovore. |
| **Email** | P0 | Resend/Postmark, DKIM/SPF/DMARC na domenu | Transakcioni email; prilozi PDF do 10 MB; `List-Unsubscribe` za marketinške. |
| **VIN dekoder** | P1 | `VinDecoder.decode(vin) → {make, model?, year, country, engine?}` | Osnovno lokalno (WMI tabela, godina iz 10. znaka) + eksterni API po izboru; keš rezultata po VIN-u (globalna tabela). |
| **SEF (e-faktura)** | P2 | `SefClient.sendInvoice(ubl) / getStatus / cancel / storno` | UBL 2.1 po srpskoj CIUS; API ključ tenanta (čuva se šifrovano); demo okruženje SEF-a za testove; obavezno čuvanje XML-a i SEF PDF-a. |
| **Fiskalizacija (ESIR → PFR)** | P2 | `FiscalClient.issue(receipt) → {invoiceNumber, verificationUrl, journal}` | LPFR je u lokalnoj mreži servisa → browser na pultu ne može direktno iz cloud-a (mixed content/CORS) → opcije: (a) lokalni agent („ServisKarton Agent“, mali servis na računaru servisa koji prima zahteve preko sigurnog kanala i prosleđuje LPFR-u), (b) VPFR (direktno iz cloud-a sa sertifikatom tenanta), (c) izvoz u postojeći akreditovani ESIR. Preporuka: (b) gde je moguće, (c) kao brz početak, (a) za servise sa LPFR-om. Akreditacija našeg ESIR-a je zaseban projekat sa Poreskom upravom. |
| **PSP (online plaćanje)** | P2 | `PaymentProvider.createCheckout / webhook` | Domaći PSP sa 3-D Secure i RSD; nikad ne čuvamo podatke kartice. |
| **Knjigovodstvo** | P2 | CSV/XLSX izvoz (P1) → API/webhook | Format izvoza se dogovara sa knjigovođom pilot-servisa i čuva kao šablon. |
| **Kalendar (Google/Outlook)** | P2 | iCal feed po resursu (read-only) | Jednostavno, bez OAuth-a. |

Svaka integracija ima `MockAdapter` koji se koristi u testovima i u dev okruženju; prebacivanje kroz env varijable.

### 9.10. Observability, backup, DR

- **Greške:** Sentry (frontend + server), sa `tenant_id` i `membership_id` kao tagovima, bez ličnih podataka u porukama.
- **Logovi:** strukturirani JSON (pino), `request_id` kroz ceo zahtev; nikad puni telefoni/emailovi (maskiranje `+38164***567`).
- **Metrike:** latencija po ruti (p50/p95), greške po ruti, dužina reda poruka, uspeh isporuke po kanalu, veličina skladišta po tenantu, broj aktivnih linkova.
- **Produktna analitika:** PostHog/Plausible self-host u EU, samo za interni UI (nikad na javnim stranama), bez ličnih podataka, opt-out po tenantu.
- **Backup:** Supabase PITR (7 dana P0, 30 dana P1) + noćni logički dump u drugi region/provajder (šifrovan, 90 dana). Storage: verzionisanje bucket-a + nedeljna replika u drugi provajder (P1).
- **DR cilj:** RPO 24 h (P0) → 1 h (P1); RTO 8 h (P0) → 2 h (P1). Vežba vraćanja iz backupa kvartalno, dokumentovana.
- **Statusna strana** i kontakt za incidente (P1).

### 9.11. Bezbednost aplikacije

- OWASP ASVS nivo 2 kao referentna lista; obavezno: CSP (`default-src 'self'`, bez inline skripti osim nonce), HSTS, `X-Frame-Options: DENY` (javne strane `SAMEORIGIN` ako se ugrađuju — ne u v1), CSRF zaštita Server Actions (Next.js ugrađeno + `Origin` provera), rate limiting prijave i javnih ruta, zaključavanje naloga, validacija svih ulaza `zod`-om, parametrizovani upiti isključivo.
- Tajne u Vercel/Supabase env-u, rotacija API ključeva provajdera na 12 meseci, SEF/PFR sertifikati tenanta šifrovani ključem iz KMS-a (`pgsodium`).
- Zavisnosti: Dependabot/Renovate, `npm audit` u CI, lock fajl.
- Penetracioni test pre v1.0 (eksterni), fokus: izolacija tenanata, javne strane, upload.
- Sigurnosni događaji u audit (prijave, promene dozvola, izvozi, opozivi).

### 9.12. Performanse i skalabilnost

| Scenario | Cilj | Kako |
|---|---|---|
| Globalna pretraga | p95 < 300 ms pri 100k vozila | `pg_trgm` GIN, limit 5 po tipu, debounce 150 ms |
| Lista naloga (50) | p95 < 400 ms | RSC, kursorska paginacija, materijalizovani zbirovi |
| Kanban (200 otvorenih) | p95 < 600 ms + Realtime ažuriranje | jedan upit, Realtime kanal po tenantu |
| Karton vozila (javno) | p95 < 500 ms | jedna SECURITY DEFINER funkcija, keš 60 s |
| Upload 10 fotografija | < 20 s na 4G | klijentska kompresija, paralelno 3 |
| PDF računa | < 3 s | prerenderovan šablon, keš fontova |
| Veličina tenanta | 10 godina × 3.000 naloga/god = 30k naloga, 300k stavki, 200k priloga (~100 GB) bez degradacije | indeksi iz 8.4, particionisanje `audit_log` i `message` po mesecu, `attachment` po `tenant_id` hash (P2) |
| Broj tenanata | 1.000 na jednoj instanci Postgresa | RLS + indeksi sa `tenant_id` prvi; connection pooling (Supavisor) |

### 9.13. Okruženja, CI/CD, kvalitet koda

- Okruženja: `local` (Supabase CLI docker), `preview` (Vercel preview + Supabase branch po PR-u), `staging` (kopija produkcije bez ličnih podataka — anonimizovan dump), `production`.
- CI (GitHub Actions): lint (eslint, typescript strict), unit (vitest, `packages/domain` 100 % pokrivenost obračuna i mašine stanja), integracioni (Playwright protiv preview-a: tokovi A, D, E, F; cross-tenant test; test zabranjenih polja na javnoj strani), migracije se primenjuju na praznu bazu i na kopiju staginga.
- Deploy: `main` → staging automatski; produkcija ručnim odobrenjem; migracije pre koda, unazad kompatibilne (expand → migrate → contract).
- Feature-flagovi za sve P1/P2 funkcije; nova funkcija ide u produkciju isključena.
- Verzionisanje semantičko; changelog vidljiv u aplikaciji („Šta je novo“).

---
## 10. Frontend specifikacija

### 10.1. Principi dizajna

1. **Dva konteksta, jedan kod.** Pult (desktop, miš, puno informacija) i radionica (telefon, jedna ruka, rukavice, loše svetlo). Isti ekrani, responzivni; na < 768 px raspored je jednokolonski, kontrole ≥ 48 px, primarna akcija na dnu (palac).
2. **Broj dodira je metrika.** Ciljevi: novi prijem za postojeće vozilo ≤ 4 dodira posle pretrage; fotografija na nalog ≤ 2 dodira; promena statusa ≤ 2 dodira.
3. **Registracija je identitet.** Registarska oznaka je svuda najkrupniji tekst na kartici vozila/naloga, u monospace fontu, u obliku tablice (`BG 123-AB`).
4. **Ništa se ne gubi.** Forme čuvaju draft lokalno (sessionStorage) dok se ne sačuvaju; upload ima red; napuštanje nesačuvane forme traži potvrdu.
5. **Statusi su boje, boje su dosledne.** Jedna paleta statusa naloga kroz celu aplikaciju (lista, tabla, karton, dokumenti).
6. **Pristupačnost nije opcija.** WCAG 2.1 AA: kontrast ≥ 4.5:1, fokus vidljiv, sve kontrole dostupne tastaturom, `aria-live` za rezultate pretrage i statuse uploada, bez informacije prenete samo bojom (semafor ima i ikonu).
7. **Tamna tema** za radionicu (podrazumevano prati OS); dizajn tokeni za obe.

### 10.2. Tehnički okvir frontenda

- Next.js App Router, React 19, TypeScript strict; Tailwind CSS + shadcn/ui (Radix primitivi) kao osnova komponenti; `react-hook-form` + `zod` za forme; TanStack Query za klijentsko keširanje gde RSC nije dovoljan (Kanban, pretraga, inbox); `@dnd-kit` za prevlačenje; `date-fns` + `Intl` za formate; ikonice `lucide-react`.
- Design tokeni u CSS varijablama (`--color-status-received`, `--radius`, `--space-*`), generisani iz jednog fajla (`tokens.json`) za svetlu i tamnu temu.
- Storybook za `packages/ui`; vizuelni regresioni testovi (Chromatic ili Playwright screenshot) za ključne komponente.

### 10.3. Informaciona arhitektura (sitemap)

```
/login, /invite/[token], /reset
/ (Početna / Danas)
/nalozi                      lista + filteri        /nalozi/tabla (Kanban, P1)
/nalozi/novi                 brzi prijem (wizard 3 koraka)
/nalozi/[id]                 detalj naloga (tabovi: Pregled · Stavke · Fotografije · Inspekcija · Predračun · Naplata · Poruke · Istorija)
/nalozi/[id]/inspekcija/[inspId]   izvođenje inspekcije (mobilni fokus)
/vozila                      lista             /vozila/[id]   karton (tabovi: Istorija · Podaci · Vlasnici · Galerija · Podsetnici · Linkovi)
/klijenti                    lista             /klijenti/[id] profil (tabovi: Vozila · Nalozi · Finansije · Komunikacija · Podaci)
/kalendar                    dan/nedelja/lista (P1)
/finansije/dugovanja         /finansije/uplate   /finansije/racuni   /finansije/kasa (dnevni pregled)
/katalog                     usluge i delovi   /katalog/paketi   /magacin   /magacin/ulaz   /magacin/inventura   (P1)
/izvestaji/[vrsta]           (P1)
/inbox                       poruke klijenata (P1)
/podesavanja/...             servis · zaposleni · numerisanje · pdv · statusi · deljenje · poruke · garancije · resursi · integracije · podaci (izvoz/uvoz) · audit
/k/[token]                   JAVNO: karton / nalog / predračun / inspekcija / termin
/s/[slug]/zakazivanje        JAVNO: online zakazivanje (P2)
```

Navigacija: desktop — leva traka (ikona + naziv), gore globalna pretraga i dugme „Novi prijem“; mobilni — donja traka sa 5 stavki (Početna, Nalozi, [+ Prijem], Vozila, Više) i pretraga na vrhu.

### 10.4. Globalne komponente

| Komponenta | Opis i ponašanje |
|---|---|
| `GlobalSearch` | Jedno polje, `Ctrl/Cmd+K`, debounce 150 ms, rezultati grupisani (Vozila, Klijenti, Nalozi, Računi), navigacija strelicama, `Enter` otvara; prazno stanje nudi „Novo vozilo sa ovom registracijom“ kad unos liči na tablicu. |
| `PlateBadge` | Registracija u obliku tablice, monospace, veličine sm/md/lg; klik → vozilo. |
| `StatusChip` | Boja + ikona + naziv statusa; varijanta sa vremenom u statusu („U radu · 2 h 15 min“). |
| `MoneyText` | Formatiranje po lokalu (`12.450,00 RSD`), negativno crveno, opcija bez decimala. |
| `VehicleCard` | Marka/model/godište, `PlateBadge`, vlasnik, km, poslednji servis, otvoreni nalozi, ikona upozorenja (registracija ističe). |
| `OrderCard` | Za Kanban/liste: `PlateBadge`, marka/model, klijent (ime + ikona kanala), mehaničar avatar, status, vreme, ikone (čeka deo, čeka odobrenje, neplaćeno, hitno). |
| `PhotoGrid` + `Lightbox` | Mreža thumb-ova sa kategorijom, višestruki izbor, lightbox sa zumom, „pre/posle“ slajder, anotacija (DVI). |
| `UploadDropzone` / `CameraButton` | Desktop: prevuci-i-pusti više fajlova; mobilni: dugme „Slikaj“ (`capture="environment"`) i „Iz galerije“; prikaz napretka po fajlu, otkazivanje, red offline. |
| `ItemEditor` | Tabela stavki sa inline izmenom (naziv, kol., cena, PDV, popust), brz unos iz kataloga sa autocomplete-om, grupisanje, prevlačenje redosleda, prikaz nabavne cene i marže samo sa dozvolom; mobilni: svaka stavka kao kartica sa „Uredi“ bottom-sheet-om. |
| `TotalsPanel` | Rekapitulacija (rad, delovi, popust, osnovica po stopi, PDV, ukupno, plaćeno, preostalo), uvek vidljiva (sticky dno na mobilnom). |
| `StatusTransitionMenu` | Prikazuje samo dozvoljene prelaze (iz mašine stanja), traži razlog kad je obavezan, prikazuje da li će klijent dobiti poruku. |
| `ShareSheet` | Kreiranje/izbor linka: tip, rok, PIN, prikaz cena; dugmad „Kopiraj link“, „Kopiraj poruku“, „Podeli“ (Web Share), „Pošalji SMS/Viber/Email“ (P1), QR prikaz; lista aktivnih linkova sa „Opozovi“. |
| `TimelineList` | Hronologija na vozilu/klijentu/nalogu: statusi, poruke, uplate, prilozi, odobrenja — sa filterom po tipu. |
| `EmptyState` | Ilustracija + jedna rečenica + primarna akcija („Nema naloga. Primi prvo vozilo.“). |
| `ConfirmDialog` | Za destruktivne i finansijske akcije; za nepovratne (anonimizacija, storno računa) traži unos reči „POTVRDI“ ili lozinke. |
| `OfflineBanner` | „Nema interneta — izmene se čuvaju i šalju kad se veza vrati (3 u redu)“. |

### 10.5. Specifikacija ekrana

Format: svrha → sadržaj → akcije → stanja → validacije/pravila → mobilne napomene.

#### 10.5.1. Početna / Danas (`/`)

- **Svrha:** jedan pogled na dan.
- **Sadržaj:** red brojača-kartica (klik filtrira listu naloga): U servisu (po statusu, mini bar), Čeka deo, Čeka odobrenje, Spremno za preuzimanje, Neplaćeno (iznos), Danas termini (P1). Ispod: „Danas dolaze“ (termini, P1), „Poslednje aktivnosti“ (10 naloga sa statusom i vremenom), „Upozorenja“ (nalozi koji kasne, linkovi sa 5 neuspelih PIN-ova, zalihe ispod minimuma P1).
- **Akcije:** „Novi prijem“ (primarna, veliko), globalna pretraga.
- **Stanja:** prazno (novi tenant: koraci onboardinga sa štikliranjem), učitavanje (skeleton kartica), greška (retry).
- **Mobilno:** brojači u horizontalnom skrolu 2×3, „Novi prijem“ kao plutajuće dugme.

#### 10.5.2. Brzi prijem (`/nalozi/novi`) — wizard

- **Korak 1 — Vozilo:** polje registracije (auto-fokus, velika slova, maska), ispod rezultati uživo; „Novo vozilo“ otvara polja: VIN (sa dekodiranjem P1), marka (autocomplete iz liste marki), model, godište, gorivo. Ako je registracija aktivna na drugom vozilu → upozorenje sa izborom.
- **Korak 2 — Klijent:** ako vozilo ima vlasnika, prikazan je sa „Promeni“ (→ tok H); inače pretraga klijenta po imenu/telefonu ili „Novi klijent“ (tip, ime, telefon obavezno ili email; ostalo kasnije). Detekcija duplikata (FR-CUS-002).
- **Korak 3 — Nalog:** kilometraža (numerička tastatura, upozorenje ako manja od poslednje), nivo goriva (8 segmenata), prijavljeni problem (textarea + čipovi čestih: „Redovan servis“, „Buka“, „Kočnice“, „Klima“, „Lampica“, „Tehnički“), prioritet, mehaničar (opciono), obećano vreme (opciono), fotografije prijema (CameraButton, do 10), vidljivo klijentu (podrazumevano iz podešavanja).
- **Akcije:** „Otvori nalog“ → detalj naloga sa toast-om i ponudom „Pošalji prijemnicu“ (ShareSheet).
- **Validacije:** registracija ili VIN obavezni; klijent sa bar jednim kontaktom; km ceo broj 0–9.999.999.
- **Mobilno:** jedan korak po ekranu, napredak 1/3, dugme „Dalje“ sticky dole; nazad čuva unos.

#### 10.5.3. Lista naloga (`/nalozi`)

- Filteri (čipovi + panel): status (multi), mehaničar, period, klijent, vozilo, naplata (neplaćeno/delimično/plaćeno), prioritet, oznake, tekst. Sačuvani filteri („Moji otvoreni“, „Čeka deo“, „Za naplatu“).
- Kolone (desktop): broj, `PlateBadge`, vozilo, klijent, status + vreme, mehaničar, iznos, plaćeno, prijem, obećano. Sortiranje po koloni. Grupisanje po statusu (opciono).
- Red → detalj; brze akcije na hover: promena statusa, poziv klijenta (tel:), pošalji link.
- Izvoz CSV sa aktivnim filterima. Paginacija „Učitaj još“ (kursor).
- Mobilno: `OrderCard` lista, filteri u bottom-sheetu, swipe levo = promena statusa (sa potvrdom).

#### 10.5.4. Kanban tabla (`/nalozi/tabla`, P1)

- Kolone = statusi po redosledu tenanta (sistemski + prilagođeni; `delivered` i `cancelled` sakriveni iza „Prikaži završene“). Kartice `OrderCard`. Prevlačenje → `StatusTransitionMenu` ako prelaz zahteva razlog; nedozvoljen prelaz vizuelno zabranjen.
- Realtime: promene drugih korisnika se pojavljuju bez osvežavanja (Supabase Realtime kanal `tenant:{id}:orders`).
- Brojač i zbir iznosa po koloni u zaglavlju. Filter po mehaničaru.
- Mobilno: jedna kolona sa horizontalnim tabovima statusa; promena statusa dugmetom, ne prevlačenjem.

#### 10.5.5. Detalj naloga (`/nalozi/[id]`)

- **Zaglavlje (sticky):** broj, `PlateBadge` + vozilo (link), klijent (ime, telefon sa tel:, kanal), `StatusChip` + `StatusTransitionMenu`, mehaničar(i), prijem/obećano/završeno, ikone upozorenja, dugmad: „Podeli“ (ShareSheet), „PDF“ (meni: nalog interni, nalog za klijenta, prijemnica, predračun, karton), „…“ (kloniraj, otkaži, reklamacija).
- **Tab Pregled:** prijavljeni problem, dijagnostika (inline edit), napomena za klijenta, interne napomene (vizuelno označene „interno“), km/gorivo, preporuke (lista sa prioritetom, dugme „Dodaj u nalog/predračun“), poslednja aktivnost.
- **Tab Stavke:** `ItemEditor` + `TotalsPanel`; dugmad: „Dodaj uslugu“, „Dodaj deo“, „Dodaj paket“ (P1), „Popust na nalog“; svaka stavka ima status (pending/done/not_done) sa brzim prekidačem za mehaničara; zaključan nalog prikazuje katanac i razlog.
- **Tab Fotografije:** `PhotoGrid` po kategoriji sa `CameraButton`; višestruki izbor → „Vidljivo klijentu“ / „Obriši“ / „Kategorija“.
- **Tab Inspekcija (P1):** lista inspekcija (status, mehaničar, rezime zeleno/žuto/crveno), „Nova inspekcija“ (izbor šablona), pregled rezultata po sekciji sa fotografijama, „Napravi predračun iz crvenih/žutih“.
- **Tab Predračun:** verzije sa statusom; za `draft`: editor stavki sa grupama i `required/recommended`; „Pošalji“ (ShareSheet sa rokom važenja); za `sent`: ko je otvorio i kad, „Zabeleži usmeno odobrenje“; za odlučen: koje stavke su odobrene/odbijene, zapis odobrenja (ime, vreme, način).
- **Tab Naplata:** rekapitulacija, dokumenti (interni obračun / račun / knjižno), „Izdaj račun“ (izbor tipa, pregled pre izdavanja, potvrda), uplate sa rasporedom, „Evidentiraj uplatu“ (iznos prepopunjen preostalim, način, datum, napomena), status naplate, dugovanje, „Pošalji opomenu“ (P1).
- **Tab Poruke (P1):** hronologija poslatih/primljenih poruka za ovaj nalog, slanje slobodne poruke ili iz šablona.
- **Tab Istorija:** `TimelineList` iz `order_status_history`, `audit_log`, odobrenja, uplate.
- **Stanja:** zaključan (posle računa), otkazan (sivo, samo čitanje), reklamacija (traka sa linkom na originalni nalog).
- **Mobilno:** tabovi kao horizontalni skrol; za mehaničara podrazumevani tab je Stavke; sticky dno: „Slikaj“ + „Status“.

#### 10.5.6. Izvođenje inspekcije (`/nalozi/[id]/inspekcija/[inspId]`, P1)

- Ekran optimizovan za telefon u jednoj ruci: zaglavlje sa napretkom (14/25) i sekcijom; lista stavki, svaka: naziv, tri velika dugmeta (zeleno ✓ / žuto ! / crveno ✕, ≥ 56 px), kamera, mikrofon (Web Speech API → tekst, uz ručnu ispravku), N/A. Merenja: numerička tastatura, jedinica, boja prema pragu.
- Crveno sa obaveznom fotografijom: dugme „Završi“ onemogućeno dok nedostaje, sa listom šta fali.
- Auto-save svake promene; radi offline (red). „Završi inspekciju“ → rezime → opcija „Napravi predračun“.

#### 10.5.7. Karton vozila (`/vozila/[id]`)

- **Zaglavlje:** `PlateBadge` lg, marka/model/godište/motor, VIN (kopiraj), km, vlasnik (link; „Promeni vlasnika“ P1), upozorenja (registracija/tehnički ističu), dugmad: „Novi nalog“, „Podeli karton“ (ShareSheet), „QR nalepnica“ (P1), „PDF kartona“.
- **Tab Istorija:** vertikalna hronologija naloga (datum, km, status, kratak opis stavki, iznos, mehaničar, broj fotografija), filter po godini; otvorene preporuke na vrhu; aktivne garancije (P1). Nalozi iz prethodnih perioda vlasništva vizuelno odvojeni („Prethodni vlasnik“) sa prikazom samo za `owner/advisor`.
- **Tab Podaci:** forma vozila (inline edit).
- **Tab Vlasnici:** periodi vlasništva sa datumima; „Ispravi“ (za grešku) vs „Promena vlasnika“.
- **Tab Galerija:** svi prilozi kroz naloge, filter kategorija/datum, „pre/posle“.
- **Tab Podsetnici (P1):** sledeći servis (datum/km), registracija, tehnički, prilagođeni; status slanja.
- **Tab Linkovi:** aktivni i opozvani deljivi linkovi sa statistikom otvaranja i „Opozovi“.

#### 10.5.8. Profil klijenta (`/klijenti/[id]`)

- Zaglavlje: ime/naziv, tip, kontakti (tel:, mailto:, ikone kanala), oznake, dugovanje (crveno), avans (zeleno), „Novi nalog“ (bira vozilo), „Uredi“, „Spoji“ (P1), „…“ (arhiviraj, izvezi podatke, anonimizuj — P1).
- Tabovi: Vozila (trenutna i bivša), Nalozi, Finansije (računi, uplate sa rasporedom, dugovanja po starosti, „Evidentiraj uplatu“ na nivou klijenta sa automatskim rasporedom i ručnom izmenom, „Zbirna faktura“ P1), Komunikacija (P1), Podaci (forma, kontakt osobe za firmu, uslovi plaćanja, pristanci).

#### 10.5.9. Kalendar (`/kalendar`, P1)

- Prikaz dana sa kolonama po resursu, 15-min mreža, radno vreme osenčeno; nedelja kompaktno; lista. Klik na slobodno → forma termina (bottom-sheet/dijalog) sa pretragom vozila/klijenta ili „nepoznato vozilo“. Prevlačenje menja vreme/resurs; promena trajanja razvlačenjem.
- Kartica termina: vreme, `PlateBadge` ili tekst, klijent, razlog, status (boja), ikona potvrde. Na dan termina dugme „Prijem“ → wizard sa prenetim podacima.

#### 10.5.10. Finansije

- **Dugovanja:** tabela po klijentu (ukupno, 0–30, 31–60, 61–90, 90+, poslednja uplata, poslednja opomena), proširivo na naloge/račune; „Pošalji opomenu“ (P1), „Evidentiraj uplatu“. Zbir na vrhu.
- **Uplate:** lista sa filterima (period, način, zaposleni), storno akcija (razlog), izvoz.
- **Računi (P1):** lista dokumenata po tipu/statusu, PDF, knjižno odobrenje, status SEF/fiskalni (P2) sa greškom i „Pokušaj ponovo“.
- **Kasa (P1):** dan po načinu plaćanja i zaposlenom; izbor dana.

#### 10.5.11. Katalog i magacin (P1)

- Katalog: tabela sa pretragom, tip, kategorija, cena, PDV, garancija, zalihe (ako se prate); inline izmena cene (sa istorijom); uvoz/izvoz; paketi kao zasebna lista sa editorom stavki.
- Magacin: stanje po artiklu (na stanju, rezervisano, dostupno, min, lokacija), filter „ispod minimuma“; „Ulaz robe“ forma (dobavljač, račun, stavke sa autocomplete-om i skenerom barkoda P2); „Inventura“ (lista, unos izbrojanog, razlika, potvrda); kretanja po artiklu.

#### 10.5.12. Izveštaji (P1)

- Zajednički okvir: period (preseti + prilagođen), uporedni period, grupisanje, grafikon (recharts) + tabela, izvoz. Vrste prema FR-RPT-001..006. Marža dostupna samo sa dozvolom (inače tab nije prikazan).

#### 10.5.13. Podešavanja

- Svaka sekcija je zasebna strana sa formom i „Sačuvaj“; opasne radnje (brisanje statusa, promena numerisanja posle izdatih dokumenata) uz `ConfirmDialog`. Zaposleni: lista, pozivnice, uloge, deaktivacija, PIN (P1). Deljenje: podrazumevane vrednosti (FR-TEN-008) sa pregledom kako javna strana izgleda („Pregled kao klijent“). Poruke: šabloni sa placeholderima, pregled, test slanje sebi. Integracije (P1/P2): ključevi provajdera, SEF, PFR, status veze. Podaci: uvoz (wizard), izvoz tenanta, politika zadržavanja, audit pregled.

### 10.6. Forme i validacija

- Jedan izvor istine: `zod` šeme u `packages/domain`, deljene između klijenta i servera; poruke grešaka lokalizovane.
- Validacija pri izlasku iz polja i pri slanju; greška ispod polja + sažetak na vrhu za duže forme; prvo polje sa greškom dobija fokus.
- Normalizacija pri unosu: registracija (velika slova, ćirilica→latinica mapiranje za `АВЕКМНОРСТХ`), telefon (E.164 sa podrazumevanom zemljom tenanta), VIN (velika slova, zabrana I/O/Q sa objašnjenjem), novac (lokalni separator, čuva se kao broj).
- Novčana polja: maska `12.450,00`, bez negativnih osim gde je dozvoljeno (storno).
- Datumi: `Intl` kratki format (`28.10.2026.`), picker sa tastaturnim unosom.
- Draft: forme duže od 3 polja čuvaju draft u `sessionStorage` pod ključem rute; obnavljanje uz pitanje.

### 10.7. Lokalizacija i formati

- Jezici UI: `sr-Latn` (podrazumevano), `sr-Cyrl` (transliteracija iz istog izvora + ručne ispravke), `en`. Biblioteka `next-intl`; svi stringovi u fajlovima poruka, bez teksta u komponentama.
- Jezik javne strane: po klijentu (`customer.language`), fallback na tenant.
- Formati: valuta `RSD` bez decimala u prikazu listi (sa decimalama u dokumentima), datum `d.M.yyyy.`, vreme 24 h, nedelja počinje ponedeljkom, kilometraža sa separatorom hiljada.
- Pluralizacija (ICU) za „1 nalog / 2 naloga / 5 naloga“.

### 10.8. PWA i offline

- Manifest (ime, ikone, `display: standalone`, tema), Service Worker (Workbox): app shell keširan, API odgovori `NetworkFirst` sa fallback-om za poslednje viđene naloge/vozila (24 h), prilozi `CacheFirst` (thumb).
- Offline mutacije (P1): red u IndexedDB za `setItemStatus`, `recordResult` (DVI), `createUploadIntent+upload`, `addItem` (bez cena iz kataloga ako nije keširan), `changeStatus` (samo u `in_progress`/`waiting_parts`/`completed`); ostale mutacije traže mrežu i jasno to kažu. Konflikt (neko drugi promenio): poslednji pobeđuje za statuse stavki; za cene/stavke prikazuje se dijalog poređenja.
- Push notifikacije (P1, Web Push) za interne događaje; iOS zahteva instaliranu PWA.
- Instalacioni prompt posle 3. posete; uputstvo za iOS („Dodaj na početni ekran“).

### 10.9. Javna strana — deljivi karton (`/k/[token]`)

- **Bez prijave, bez kolačića trećih strana, bez skripti trećih strana**, `noindex`. Server-render (RSC), minimalan JS (galerija, odobrenje).
- **Zaglavlje:** logo i naziv servisa, telefon (tel:), adresa (link na mape), jezik.
- **Vozilo:** marka/model/godište, registracija (maskirana po podešavanju: `BG ***-AB`), km.
- **Otvoreni nalog (ako postoji i tenant dozvoljava):** status na jeziku klijenta („Vaše vozilo je u radu“), obećano vreme, dugme „Odobri predračun“ ako čeka.
- **Istorija:** kartice naloga, najnoviji prvi: datum, km, lista radova i delova (nazivi, količine; cene po podešavanju), fotografije (grid → lightbox), napomena za klijenta, preporuke sa prioritetom (crveno/žuto/sivo), garancije („u garanciji do…“), mehaničar (po podešavanju). Nalozi ranijih vlasnika pod naslovom „Ranija istorija vozila“ bez cena i bez napomena.
- **Sledeći servis:** datum/km iz podsetnika, dugme „Zakaži“ (P2) ili „Pozovi“.
- **Podnožje:** „Preuzmi PDF“, „Pošalji poruku servisu“ (P1), link na obaveštenje o obradi podataka, „Ovaj link je lični — ne prosleđujte ga“.
- **PIN ekran:** ako je potreban: polje 4–6 cifara, poruka posle greške, blokada sa vremenom.
- **Istekao/opozvan:** neutralna strana sa nazivom servisa i telefonom, bez ikakvih podataka o vozilu.
- **Predračun (`type=estimate`):** inspekcija grupisana po boji, zatim stavke po grupama sa checkbox-ovima (`required` unapred čekirane i objašnjene; `recommended` nečekirane), zbir se menja uživo, polje „Vaše ime“, checkbox saglasnosti sa tekstom, dugme „Odobri izabrano“ / „Ne odobravam ništa“; po slanju potvrda sa rezimeom i rokom; ponovni ulazak prikazuje odluku (nema ponovnog odobravanja bez nove verzije).
- **Performanse:** LCP < 2 s na 4G; slike `next/image` sa `sizes`, thumb → medium na klik.

### 10.10. Stanja grešaka i poruke korisniku

- Greške API-ja mapirane na razumljive poruke sa akcijom („Nalog je zaključan jer je izdat račun. Da bi se promenila stavka, izdajte knjižno odobrenje.“).
- Mrežne greške: toast sa „Pokušaj ponovo“; mutacije koje su u redu pokazuju „sačuvano lokalno“.
- 403 unutar tenanta: „Nemate dozvolu za ovu radnju. Obratite se vlasniku servisa.“
- Globalni error boundary sa ID-jem greške (Sentry) za prijavu podršci.

---
## 11. Nefunkcionalni zahtevi

| ID | Oblast | Zahtev | Mera / provera |
|---|---|---|---|
| NFR-001 | Dostupnost | 99,5 % mesečno za interni UI (P0), 99,9 % (P1); javne strane isto | Uptime monitor, statusna strana |
| NFR-002 | Performanse | Ciljevi iz 9.12 | Lighthouse CI (performanse ≥ 85 mobilni), k6 test opterećenja pre v1.0 |
| NFR-003 | Skalabilnost | 1.000 tenanata, 30k naloga po tenantu bez degradacije | Test sa seed podacima ×10 |
| NFR-004 | Bezbednost | OWASP ASVS L2; penetracioni test pre v1.0; izolacija tenanata testirana u CI | Izveštaj pen-testa, CI test |
| NFR-005 | Privatnost | ZZPL/GDPR: minimizacija, svrha, rok, prava lica (12–13) | Registar obrade, DPA sa provajderima |
| NFR-006 | Rezidentnost podataka | Svi podaci i backupi u EU | Konfiguracija regiona, ugovori |
| NFR-007 | Backup/DR | RPO/RTO iz 9.10; kvartalna vežba | Zapisnik vežbe |
| NFR-008 | Pristupačnost | WCAG 2.1 AA za interni UI i javne strane | axe u CI, ručna provera čitačem ekrana za 5 ključnih ekrana |
| NFR-009 | Kompatibilnost | Poslednje 2 verzije Chrome, Safari (iOS 16+), Firefox, Edge; Android 10+; ekrani od 360 px | Playwright matrica |
| NFR-010 | Offline | Tokovi D (status stavki), C (DVI), upload fotografija rade bez mreže i sinhronizuju se | Playwright sa `offline` režimom |
| NFR-011 | Lokalizacija | sr-Latn, sr-Cyrl, en; dokumenti u sva tri | Pregled prevoda, pseudo-lokalizacija test |
| NFR-012 | Audit | Nepromenljiv log kritičnih radnji ≥ 3 godine | Test pokušaja izmene |
| NFR-013 | Nepromenljivost dokumenata | Izdati računi se ne mogu menjati ni kroz bazu bez posebne uloge | Trigger test |
| NFR-014 | Održivost koda | TypeScript strict, 100 % unit pokrivenost `packages/domain`, ≥ 70 % ukupno; ADR za svaku arhitektonsku odluku | CI pragovi |
| NFR-015 | Observability | Svaki zahtev ima `request_id`; greške sa tenant tagom; alarmi za rate grešaka > 1 % i red poruka > 500 | Sentry, dashboard |
| NFR-016 | Troškovi | Infrastruktura po tenantu Start plana < 2 EUR/mesec pri 300 naloga/mesec | Mesečni pregled računa |
| NFR-017 | Prenosivost | Nijedna poslovna logika u Supabase-specifičnim funkcijama osim RLS i javnih funkcija; Storage iza interfejsa | Pregled koda |
| NFR-018 | Dokumentacija | README za pokretanje za < 30 min; API dokumentacija generisana iz zod šema (OpenAPI) | Novi programer pokreće lokalno |

## 12. Bezbednost i privatnost (ZZPL / GDPR)

### 12.1. Kategorije podataka i osnov obrade

| Podaci | Primer | Osnov | Rok čuvanja (podrazumevano) |
|---|---|---|---|
| Identifikacioni podaci klijenta | ime, telefon, email, adresa | izvršenje ugovora (usluga) | dok traje odnos + 36 meseci neaktivnosti → predlog brisanja/anonimizacije |
| Podaci o vozilu | registracija, VIN, km | izvršenje ugovora; legitimni interes (istorija vozila) | trajno za tehničku istoriju (bez ličnih podataka po promeni vlasnika) |
| Finansijski dokumenti | računi, uplate | zakonska obaveza (čuvanje računovodstvene dokumentacije — 10 godina po domaćim propisima; proveriti sa knjigovođom) | 10 godina, nepromenljivo |
| Fotografije vozila | pre/posle, oštećenja | izvršenje ugovora; legitimni interes (dokaz) | 5 godina, zatim brisanje osim na izdatim računima |
| Dokumenti klijenta | skenirana saobraćajna, ugovori | izvršenje ugovora | do kraja odnosa + 12 meseci; nikad se ne dele preko linka bez eksplicitne oznake |
| Poruke | SMS/Viber/email sadržaj | izvršenje ugovora; pristanak (marketing) | 24 meseca |
| Logovi pristupa linkovima | skraćen IP, user-agent | legitimni interes (bezbednost) | 90 dana |
| Audit log | ko je šta menjao | legitimni interes; zakonska obaveza | 3 godine |
| Podaci zaposlenih | ime, email, aktivnosti | ugovor o radu / legitimni interes | dok traje angažman + 12 meseci |

### 12.2. Uloge po ZZPL

- **Servis (tenant) je rukovalac** podacima svojih klijenata. **Operater platforme je obrađivač.** Zato: ugovor o obradi (DPA) između operatera i svakog tenanta (deo uslova korišćenja), lista pod-obrađivača (Supabase, Vercel, SMS/Viber provajder, email provajder, Sentry) javno dostupna i ažurirana, obaveštenje o promeni pod-obrađivača 30 dana unapred.
- Za podatke zaposlenih servisa, operater je obrađivač; za podatke korisnika platforme (nalozi za prijavu) operater je rukovalac.

### 12.3. Prava lica — kako sistem podržava

| Pravo | Funkcija |
|---|---|
| Pristup i prenosivost | FR-GDPR-001 izvoz klijenta (PDF + JSON) |
| Ispravka | izmena profila; audit beleži |
| Brisanje („zaborav“) | FR-GDPR-002 anonimizacija uz zadržavanje zakonski obaveznih dokumenata; obrazloženje u izvozu |
| Prigovor na marketing | FR-MSG-008 odjava, `marketing_opt_out`, link u porukama |
| Ograničenje obrade | oznaka `processing_restricted` na klijentu (P1) blokira automatske poruke i deljenje |

### 12.4. Tehničke i organizacione mere

- Šifrovanje u prenosu (TLS 1.2+) i u mirovanju (Supabase/AWS podrazumevano); tajne tenanta (SEF ključ, PFR sertifikat) dodatno šifrovane aplikacionim ključem.
- Pseudonimizacija u analitici i logovima; nema ličnih podataka u Sentry porukama.
- Princip najmanjih privilegija: uloge; `service_role` ključ samo na serveru; pristup produkcionoj bazi samo kroz bastion sa auditom; 2FA obavezna za operatere.
- Procedura za incident: detekcija → procena → obaveštavanje tenanta u 48 h → tenant obaveštava Poverenika u 72 h ako je potrebno; šablon obaveštenja pripremljen.
- Procena uticaja (DPIA) pre uvođenja DVI video snimaka i online plaćanja.

### 12.5. Posebne napomene

- **Deljivi link je po dizajnu „ko ima link, vidi“.** Zato: PIN podrazumevano uključen za linkove koji prikazuju cene ili dokumente; linkovi predračuna ističu sa predračunom; linkovi kartona imaju rok (podrazumevano 365 dana) i obnavljaju se slanjem novog; QR nalepnica u vozilu vodi na link bez cena (podešavanje „QR link bez finansija“).
- **Fotografije mogu sadržati lične podatke** (lica, dokumenta na sedištu, registracije drugih vozila). Uputstvo mehaničaru u UI pri prvom slikanju; kategorija `document` nikad vidljiva klijentu podrazumevano; GPS se uklanja iz EXIF-a.
- **Istorija vozila za nove vlasnike** je legitimni interes (bezbednost vozila), ali sadrži samo tehničke podatke. Tenant može isključiti.

## 13. Testiranje i kriterijumi prihvatanja

### 13.1. Strategija

| Nivo | Alat | Obim | Prag |
|---|---|---|---|
| Unit | vitest | `packages/domain` (obračun, mašina stanja, raspored uplata, normalizacije, validacije), adapteri sa mockovima | 100 % domain; ≥ 80 % api |
| Integracioni (DB) | vitest + Supabase lokalno | RLS politike (pozitivni i negativni), funkcije numerisanja pod konkurentnošću, nepromenljivost računa, javne funkcije (whitelist polja), politika zadržavanja | svi testovi obavezni u CI |
| E2E | Playwright | Tokovi A–L po fazi; cross-tenant; javna strana (karton, PIN, predračun, istek); offline scenariji; mobilni viewport 360 px | zeleno za merge u `main` |
| Vizuelni | Storybook + screenshot | `packages/ui` komponente, PDF šabloni (render → slika) | bez neodobrenih razlika |
| Performanse | Lighthouse CI, k6 | 9.12 ciljevi | pre v1.0 i pre svakog velikog izdanja |
| Bezbednost | OWASP ZAP u CI (baseline), eksterni pen-test | javne rute, upload, auth | bez high/critical nalaza |
| Pristupačnost | axe-core u Playwright-u | svi ekrani | 0 critical/serious |
| UAT | pilot servis | checklista scenarija po fazi (13.3) | potpis vlasnika pilota |

### 13.2. Obavezni testni scenariji (izbor)

1. **Obračun:** 30 kombinacija (kol. 1 / 2,5 / 0,333; cene sa i bez PDV-a; popust % i iznos; stope 20/10/0; popust na nalog raspodeljen) → iznosi jednaki referentnoj tabeli; zbir stavki = zbir na nalogu = zbir na računu = zbir na PDF-u.
2. **Mašina stanja:** svaki dozvoljen prelaz prolazi, svaki nedozvoljen vraća 409 sa listom dozvoljenih; prelaz unazad traži razlog; `completed` blokiran dok stavke nemaju status.
3. **Numerisanje:** 50 paralelnih kreiranja → 50 uzastopnih brojeva; promena godine → reset; dva tipa dokumenata nezavisni.
4. **Uplate:** FIFO raspored; ručni raspored; preplata → avans; storno; status naplate posle svakog koraka.
5. **Zaključavanje:** posle `issueInvoice` izmena stavke → 409; knjižno odobrenje → novi račun.
6. **Promena vlasnika:** stari linkovi opozvani; stari nalozi zadržali `customer_id`; novi link ne vraća ništa od ličnih podataka/cena starih naloga; preklapanje perioda odbijeno od baze.
7. **Javna strana — zabranjena polja:** za svaki tip linka, odgovor (HTML + JSON) ne sadrži: `internal_notes`, `unit_cost`, `tax_id` klijenta, telefone/emailove klijenata, imena drugih klijenata, `storage_path`, Storage URL-ove. Test traži regex-om i strukturalno.
8. **PIN:** 5 pogrešnih → blokada 1 h → notifikacija servisu; ispravan PIN posle isteka blokade radi.
9. **Cross-tenant:** korisnik A sa svim ulogama pokušava svaki endpoint sa ID-jevima B → 404; Storage potpisani URL za B-ov prilog ne može se dobiti.
10. **Upload:** 12 MP HEIC sa iPhone-a → JPEG ≤ 800 KB, ispravna orijentacija, bez GPS-a; prekid mreže na 50 % → nastavak iz reda; duplikat (isti sha256) → upozorenje.
11. **Offline DVI:** 25 stavki i 6 fotografija bez mreže → sve sinhronizovano posle povratka, bez duplikata (idempotency).
12. **Podsetnici:** tiho vreme poštovano; opt-out klijent ne dobija marketing ali dobija „vozilo spremno“; Viber neisporučen → SMS posle X min, tačno jednom.
13. **Anonimizacija:** klijent anonimizovan → računi ostaju sa snapshotom, profil bez ličnih podataka, pretraga ga ne nalazi, audit ima zapis.
14. **Izvoz tenanta:** ZIP sadrži sve tabele i priloge; uvoz u prazan tenant (P2) daje iste brojeve.

### 13.3. Kriterijumi prihvatanja po fazi (UAT)

**Faza 2 (MVP) je prihvaćena kada pilot servis 4 nedelje zaredom:**
- evidentira ≥ 90 % svih prijema kroz aplikaciju (prebrojano sa vlasnikom), bez paralelne sveske za naloge;
- svaki nalog ima ≥ 1 fotografiju; prosečno vreme otvaranja naloga ≤ 90 s (mereno u aplikaciji);
- sva dugovanja su u sistemu i vlasnik ih koristi za naplatu;
- ≥ 50 % klijenata dobije link kartona i ≥ 30 % ga otvori;
- nijedan incident izolacije podataka ni izgubljen prilog.

**Faza 4 (v1.0) je prihvaćena kada:**
- ≥ 60 % predračuna se šalje linkom i ≥ 40 % odobrava preko linka;
- DVI se radi na ≥ 50 % naloga tipa redovan servis;
- podsetnici se šalju automatski i ≥ 10 % rezultuje terminom u 60 dana;
- knjigovođa prihvata mesečni izvoz bez ručne dorade;
- tri različita servisa koriste sistem bez intervencije programera.

## 14. Plan isporuke

Faze su sekvencijalne po zavisnostima; unutar faze redosled je prioritetni. Oznake u zagradi su FR grupe.

### Faza 0 — Priprema (pre koda)
- Potvrđene odluke iz dela 15 (A–H).
- Pilot servis izabran; potpisan dogovor o pilotu i DPA; intervju 60 min sa vlasnikom i mehaničarom; snimak postojećeg toka (sveska/Excel).
- Dizajn-tokeni, 8 ključnih ekrana kao klikabilni prototip (Početna, Prijem, Detalj naloga mobilni, Stavke desktop, Karton, Javna strana, Dugovanja, Podešavanja deljenja), testiran sa 3 osobe iz servisa.
- Repo, CI, okruženja, seed.

### Faza 1 — Jezgro evidencije (P0 deo 1)
- AUTH-001,003,004,006,007,009 · TEN-001,002,003,004,008,011 · CUS-001,002,004,005 · VEH-001..004,007,009 · ORD-001..006,008,009,013 · ITM-001..004 · FIN-001,002 · ATT-001..004,006 · SRCH-001 · DASH-001 · DOC-001 (prijemnica, nalog, karton),002,004 · AUD-001 · IMP-003 (CSV izvoz lista).
- Izlaz: interno upotrebljiv sistem bez deljenja i uplata.

### Faza 2 — Naplata, deljenje, MVP pilot (P0 deo 2)
- PAY-001..005 · FIN-003 · INV-001 (interni obračun),002 · SHARE-001..004,006,007,008,010 · MSG-002 (ručno/Web Share/email) · EST-001,003,004,007 (jednostavan predračun) · DOC-001 (predračun, obračun).
- Pilot 4 nedelje; nedeljni sastanak; ispravke; kriterijumi iz 13.3.

### Faza 3 — Profesionalni tok (P1 deo 1)
- DVI-001..006 · EST-002,005,006,008,009 · SHARE-005,011,012 · CAT-001..004 · ORD-010 (Kanban),011,012,014 · INV-003,004,005,008 (PDF račun, knjižno, zbirna, izvoz za knjigovođu) · ATT-005 (offline),007,008 · AUTH-002,005,008 · TEN-005,006,007,009 · CUS-003,006,007 · VEH-005,008,010,012.

### Faza 4 — Komunikacija, zakazivanje, izveštaji — v1.0 (P1 deo 2)
- MSG-001,003..009 · REM (sve) · APT-001..006 · STK-001..005 (magacin) · WAR-001..004 · RPT-001..006 · DASH-002 · PAY-006,008 · IMP-001 · GDPR-001..005 · AUD-002 · DOC-003.
- Pen-test, k6, DR vežba; onboarding 2–3 dodatna servisa.

### Faza 5 — SaaS i lokalne integracije — v2.0 (P2)
- TEN-010 (multi-lokacija) · samostalna registracija i naplata pretplate · INV-006 (fiskalizacija), INV-007 (SEF) · PAY-007 (online plaćanje) · APT-007 (online zakazivanje) · SHARE-009 (flotni portal) · STK-006..008 (nabavka, više magacina, barkod) · VEH-006 (OCR),011 (gume) · IMP-002,004 (API, webhookovi) · MSG WhatsApp · DVI-007 · RPT-007 · zamenska vozila.

### Zavisnosti koje određuju redosled
- Deljivi link (F2) zavisi od priloga i vidljivosti stavki (F1).
- DVI (F3) zavisi od javne strane i priloga (F2).
- Automatske poruke (F4) zavise od šablona i provajdera (F3/F4) i od pristanaka (GDPR-004).
- Fiskalizacija/SEF (F5) zavise od nepromenljivih računa i PDV logike (F3) i od odluke o ESIR strategiji (15-G).

## 15. Rizici i odluke

### 15.1. Odluke koje treba potvrditi pre Faze 1 (sa predloženim podrazumevanim izborom)

| # | Odluka | Predlog | Posledica ako se promeni kasnije |
|---|---|---|---|
| A | Single vs multi-tenant | Multi-tenant arhitektura od F1, komercijalno od F5 | Vrlo skupa migracija (sve tabele, RLS, skladište) |
| B | Vlasništvo vozila | Zasebna tabela sa periodima (8.4.3) | Nemoguće retroaktivno rekonstruisati |
| C | Cene sa ili bez PDV-a u unosu | Podešavanje po tenantu, interno se čuva neto + stopa | Zaokruživanje i razlike na dokumentima |
| D | Uplata na nivou klijenta sa rasporedom | Da (8.4.9) | Avansi i zbirne uplate neizvodljivi |
| E | Javni prikaz bez prijave + PIN | Da, PIN podrazumevano za cene/dokumente | Promena podrazumevanih vrednosti je laka; model je isti |
| F | Stek | Next.js + Supabase (EU) + Vercel | Promena posle F2 znači prepis |
| G | Strategija fiskalizacije | F2: nefiskalni interni obračun; F3: PDF račun; F5: VPFR direktno ili integracija sa postojećim ESIR-om; sopstvena akreditacija samo ako ima ≥ 20 tenanata koji je traže | Pogrešna procena troška akreditacije |
| H | Kanal poruka | Viber + SMS fallback (F4), email od F1 | Zavisnost od provajdera; interfejs apstraktan |

### 15.2. Rizici

| Rizik | Verovatnoća | Uticaj | Mera |
|---|---|---|---|
| Mehaničari ne unose podatke (sistem postaje posao prijemnog) | visoka | visok | Mobilni UX sa ≤ 2 dodira; kiosk PIN; mehaničar vidi samo svoje; merenje unosa po osobi; vlasnik vidi ko ne unosi |
| Pilot nema stvarnu potrebu za deljivim linkom | srednja | srednji | Meriti otvaranja linkova od F2; ako < 20 %, prioritet F3 ide na DVI/predračun umesto na karton |
| Loša mreža u radionici | visoka | srednji | Offline red (F3), kompresija slika (F1), PWA keš |
| Fiskalizacija/SEF komplikovaniji od procene | srednja | visok | Odluka G; integracija sa postojećim ESIR-om kao fallback; knjigovođa pilota uključen od F3 |
| Curenje podataka kroz javnu stranu | niska | vrlo visok | Whitelist funkcije (8.6), automatski test zabranjenih polja (13.2 #7), pen-test, PIN podrazumevano |
| Troškovi skladišta fotografija | srednja | nizak | Kompresija ≤ 600 KB, varijante, politika zadržavanja 5 godina, planovi sa limitima |
| Viber/SMS provajder nepouzdan ili skup | srednja | srednji | Apstraktan interfejs, dva provajdera konfigurabilna, fallback |
| Prevelik obim F3/F4 | visoka | srednji | Feature-flagovi; svaka funkcija ide u produkciju isključena; prioritizacija po merenju iz pilota |
| Zavisnost od Supabase-a | niska | srednji | Postgres standardan; Storage iza interfejsa; logička replika van Supabase-a |
| Promena vlasnika pogrešno unesena (ispravka vs. promena) | srednja | srednji | Dve odvojene akcije sa jasnim objašnjenjem; audit; mogućnost poništavanja u 24 h |

---

## Prilozi

### Prilog A — Matrica dozvola (P0 uloge)

| Dozvola | owner | advisor | technician | accountant |
|---|---|---|---|---|
| customer.read_basic (ime, telefon) | ✓ | ✓ | ✓ | ✓ |
| customer.read_full / write | ✓ | ✓ | — | — |
| vehicle.read / write | ✓ | ✓ | ✓ / — | ✓ / — |
| order.read | ✓ | ✓ | ✓ (dodeljeni + otvoreni) | ✓ |
| order.create / write | ✓ | ✓ | — | — |
| order.write_items (naziv, kol., status, bez cena) | ✓ | ✓ | ✓ | — |
| order.write_prices | ✓ | ✓ | — | — |
| order.status (radni prelazi) | ✓ | ✓ | ✓ (in_progress↔waiting_parts→completed) | — |
| order.status_back (unazad) | ✓ | ✓ | — | — |
| attachment.write / delete | ✓ | ✓ | ✓ / svoje | — |
| estimate.* | ✓ | ✓ | — | čitanje |
| inspection.write | ✓ | ✓ | ✓ | — |
| invoice.issue / credit_note | ✓ | ✓ | — | — |
| payment.record / reverse | ✓ | ✓ | — | — |
| finance.read (uplate, dugovanja) | ✓ | ✓ | — | ✓ |
| finance.margin (nabavne cene, marža) | ✓ | — | — | ✓ |
| report.ops / report.finance | ✓ / ✓ | ✓ / — | — | — / ✓ |
| share.create / revoke | ✓ | ✓ | — | — |
| catalog.write, inventory.write | ✓ | ✓ | — | — |
| member.manage, tenant.settings | ✓ | — | — | — |
| data.export_tenant, data.delete, gdpr.anonymize | ✓ | — | — | — |
| audit.read | ✓ | — | — | — |

### Prilog B — Primeri API poruka

**Kreiranje naloga (Server Action `createOrder`)**
```json
{
  "vehicle_id": "0192f3a1-…",
  "customer_id": "0192f3a0-…",
  "odometer_in": 184250,
  "fuel_level": 3,
  "reported_issue": "Lupanje na prednjem desnom točku pri kočenju",
  "priority": "normal",
  "assignee_ids": ["0192e9b2-…"],
  "promised_at": "2026-10-29T15:00:00+01:00",
  "visible_to_customer": true,
  "intake_attachment_ids": ["0192f3a2-…", "0192f3a3-…"]
}
```
Odgovor `201`: `{ "id": "…", "number": "2026-00147", "status": "received", … }`

**Promena statusa — nedozvoljen prelaz**
```json
HTTP 409
{ "code": "INVALID_STATUS_TRANSITION",
  "message": "Nalog u statusu 'received' ne može direktno u 'delivered'.",
  "details": { "from": "received", "allowed": ["in_progress","awaiting_estimate","cancelled"] } }
```

**Evidentiranje uplate sa automatskim rasporedom**
```json
{ "customer_id": "…", "amount": 6000.00, "method": "cash", "paid_at": "2026-10-28T17:40:00+01:00",
  "allocations": "auto_fifo" }
```
Odgovor: `{ "payment_id": "…", "allocations": [{"service_order_id":"…","amount":3000.00},{"service_order_id":"…","amount":3000.00}], "unallocated": 0.00 }`

**Javni karton (`GET /k/<token>` → interno `public_vehicle_card`)** — struktura u 8.6; nikad ne sadrži `customer`, `internal_notes`, `unit_cost`.

**Odobrenje predračuna (`POST /api/public/share/<token>/approve`)**
```json
{ "estimate_id": "…", "approved_item_ids": ["…","…"], "declined_item_ids": ["…"],
  "signer_name": "Jelena Petrović", "consent": true, "consent_version": "2026-10-v1" }
```

### Prilog C — Podrazumevani šabloni poruka (sr-Latn, SMS/Viber)

| Događaj | Tekst (placeholderi) |
|---|---|
| order_received | `{shop.name}: primili smo vaše vozilo {vehicle.plate}. Nalog {order.number}. Prijemnica i istorija: {link}` |
| estimate_sent | `{shop.name}: predračun za {vehicle.plate} ({amount}) čeka vaše odobrenje do {estimate.valid_until}: {link}` |
| estimate_reminder | `{shop.name}: podsetnik — predračun za {vehicle.plate} još čeka odobrenje: {link}` |
| waiting_parts | `{shop.name}: za {vehicle.plate} čekamo deo, očekujemo {order.eta}. Javićemo se čim stigne.` |
| vehicle_ready | `{shop.name}: vaše vozilo {vehicle.plate} je spremno za preuzimanje. Iznos: {amount}. Radno vreme: {shop.hours}.` |
| vehicle_delivered | `{shop.name}: hvala na poverenju! Servisni karton vozila {vehicle.plate}: {link}` |
| next_service | `{shop.name}: {vehicle.plate} — vreme je za {reminder.title} ({reminder.due}). Zakažite: {shop.phone}` |
| registration_due | `{shop.name}: registracija vozila {vehicle.plate} ističe {vehicle.registration_expires}. Možemo pripremiti vozilo za tehnički.` |
| debt_reminder | `{shop.name}: podsećamo na neizmireni iznos {amount} za nalog {order.number}. Uplata: {shop.iban}, poziv na broj {invoice.reference}.` |
| appointment_reminder | `{shop.name}: podsetnik — termin za {vehicle.plate} sutra u {appointment.time}. Potvrdite: {link}` |

Pravila: ≤ 160 GSM-7 znakova gde je moguće (ćirilica/dijakritici → UCS-2, 70 znakova po segmentu — šablon prikazuje broj segmenata); marketinški šabloni imaju `Odjava: {unsubscribe}`.

### Prilog D — Podrazumevani šablon inspekcije „Standardni pregled“ (25 stavki)

Spolja: svetla i signalizacija · brisači i tečnost · stakla i retrovizori · karoserija (oštećenja) · registracija i nalepnice.
Gume: dubina šare PD/PL/ZD/ZL (merenje mm, žuto < 3, crveno < 1,6) · pritisak · oštećenja i starost (DOT).
Ispod haube: nivo i stanje ulja · rashladna tečnost · kočiona tečnost (merenje % vlage, žuto > 2, crveno > 3) · akumulator (merenje V, žuto < 12,4, crveno < 12,0) · kaiševi i creva · curenja.
Kočnice: debljina pločica P/Z (merenje mm, žuto < 4, crveno < 2) · diskovi P/Z (merenje mm vs. min) · creva i cevi · ručna.
Podvozje: amortizeri · krajevi spona i kugle · selen-blokovi · izduvni sistem · manžetne homokinetika.
Unutra: kontrolne lampice · klima (temperatura izlaza) · filter kabine · sigurnosni pojasevi.

### Prilog E — Checklista za predaju (Definition of Done) po funkciji

- [ ] Zahtev ima ID i kriterijume prihvatanja u ovom dokumentu (ili dodatak sa novim ID-jem)
- [ ] Zod šema i tipovi u `packages/domain`; unit testovi za logiku
- [ ] Use-case u `packages/api` sa proverom dozvola i upisom u audit
- [ ] RLS politika i integracioni test (pozitivan + negativan + cross-tenant)
- [ ] UI komponenta u Storybook-u sa stanjima (prazno, učitavanje, greška) i mobilnim prikazom
- [ ] E2E test glavnog toka; axe bez critical/serious
- [ ] Stringovi lokalizovani (sr-Latn, sr-Cyrl, en)
- [ ] Feature-flag (za P1/P2) i dokumentovano u „Šta je novo“
- [ ] Ako dodiruje javnu stranu: test zabranjenih polja ažuriran
- [ ] Ako dodiruje novac: scenariji obračuna prošireni i prošli
- [ ] Ako dodiruje lične podatke: tabela 12.1 ažurirana (rok, osnov)

### Prilog F — Otvorena pitanja iz briefa v0.1 i gde su odgovorena

| Pitanje iz briefa | Odgovor u ovom dokumentu |
|---|---|
| Jedan servis ili SaaS? | 4.1, 15.1-A: arhitektura SaaS od početka, komercijalno P2 |
| Interna evidencija ili formalni računi? | 7.11: P0 interni obračun, P1 PDF račun, P2 fiskalni/SEF |
| Nalog kao dokument za štampu? | 7.19: da, više dokumenata, A4 i 80 mm |
| Klijent vidi celu istoriju ili pojedinačne naloge? | 7.13: oba tipa linka; karton po periodu vlasništva |
| Dele se računi ili samo radovi i fotografije? | 7.13, FR-TEN-008: podešavanje; dokumenti nikad podrazumevano |
| Prati li se nabavna cena i marža? | FR-ITM-001, FR-RPT-002: da, sa dozvolom |
| Pravna lica i flote? | FR-CUS-006, 6.9, FR-SHARE-009 |
| Uvoz iz Excel-a? | FR-IMP-001 (P1), FR-IMP-002 (P2) |
| Koliko zaposlenih, uloge? | 7.1: neograničeno, 4 uloge + prilagođene |
| Rad bez interneta? | FR-ATT-005, 10.8: delimično, za radioničke tokove |
| Koji podaci su poverljivi? | 12.1, FR-SHARE-004: eksplicitna lista |
| Prenos istorije pri promeni vlasnika? | 6.8, FR-VEH-007..009, FR-SHARE-008 |

---

*Kraj dokumenta. Izmene se vode kroz verzije dokumenta; svaki zahtev zadržava ID.*
