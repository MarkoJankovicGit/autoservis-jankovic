# ServisKarton — Plan rada v2 (skraćeni obim)

Datum: 28.10.2026. · Zamenjuje plan v1 · Referenca: `ServisKarton_specifikacija_v1.0.md` (koristi se samo za model podataka i detalje tamo gde je obim isti)

## 1. Za koga i šta

Jedan servis, dva automehaničara. Jedan uređaj na pultu plus telefoni. Nisu obveznici PDV-a, nemaju fiskalnu kasu. Aplikacija je njihova operativna sveska: šta je rađeno, kada, na kom autu, koliko je naplaćeno, koliko je potrošeno, šta sledi.

Principi:
- Jedna lozinka za ceo servis. Nema korisnika, uloga ni pozivnica.
- Mušterija i dobavljač ne pristupaju aplikaciji. Dobijaju link ili PDF koji pokazuje samo ono što je majstor čekirao.
- Bez PDV-a, bez fiskalizacije, bez statusa osim nužnih.
- Mobilni i desktop iz istog koda. Veliki kontrolni elementi, malo klikova, bez tabova gde nisu potrebni.
- Sve što može da se izvede računanjem (status naplate, „čeka deo“, dospeće podsetnika) se izvodi, ne unosi.

## 2. Funkcionalnosti

### 2.1. Pristup
- Ekran sa lozinkom. Sesija traje godinu dana po uređaju. Dugme „Odjava“ u podešavanjima.
- Javne strane bez prijave: `/k/<token>` (karton za mušteriju), `/n/<token>` (narudžbenica za dobavljača).

### 2.2. Klijenti
- Ime ili naziv firme, telefon (više), email, napomena.
- Profil: vozila, nalozi, dugovanje.
- Upozorenje na duplikat telefona.

### 2.3. Vozila i karton
- Registracija, VIN, marka, model, godište, gorivo, motor, km, istek registracije, napomena, fotografija.
- Trenutni vlasnik. Promena vlasnika ne dira stare naloge.
- Karton vozila: hronologija naloga (datum, km, šta je urađeno, iznos, fotografije), grafikon kilometraže kroz vreme sa prosekom km/mesec, aktivni podsetnici sa procenom „kada“ (po datumu ili po projekciji km), galerija.

### 2.4. Nalozi (radni nalozi)
- Prijem na jednom ekranu: tablica (pretraga uživo, novo vozilo ako nema), klijent, km, šta mušterija prijavljuje, fotografije.
- Status: **u radu** → **završen**; otkazan kao izuzetak. „Čeka deo“ se vidi automatski ako nalog ima narudžbenicu koja nije stigla.
- Stavke: tip (rad / deo / materijal), naziv, količina, cena, nabavna cena (za deo i materijal, radi zarade), ukupno. Autocomplete naziva i cena iz prethodnih naloga.
- Opis urađenog (slobodan tekst), fotografije pre/posle.
- Pri završetku: datum završetka, km, i „Sledeći put“: jedan ili više podsetnika (naziv, za N meseci i/ili N km). Odmah vidljivo na kartonu.
- Lista naloga: filter u radu / završeni / neplaćeni, pretraga po tablici, imenu, telefonu.
- Dokumenti za štampu i PDF: **predračun** (iste stavke, pre rada), **radni nalog**, **račun** (nefiskalni; naziv i tekst dokumenta potvrđuje njihov knjigovođa).

### 2.5. Podsetnici (budući servisi)
- Nastaju iz naloga („mali servis za 12 meseci ili 15.000 km“) ili ručno na vozilu.
- Dospeće: datum, km, ili šta pre nastupi. Projekcija datuma po km iz trenda kilometraže.
- Lista „Dospeva u narednih 30 dana“ na početnoj i posebna strana; akcije: „Zakaži termin“, „Urađeno“ (automatski kad se otvori nalog sa tim podsetnikom), „Odbaci“.
- Priprema za SMS (kasnije): telefon normalizovan, polje „obavešten“ sa datumom, nema slanja u ovoj verziji.

### 2.6. Kalendar
- Termin: datum, vreme, trajanje, vozilo (ili samo tekst), klijent, razlog, napomena.
- Prikaz dana i nedelje, lista. „Danas dolaze“ na početnoj.
- „Prijem“ iz termina otvara nalog sa prenetim podacima.

### 2.7. Finansije
- **Prihodi** = uplate na naloge: samo iznos i datum (način naplate se ne vodi). Delimične uplate. Status naplate izveden: neplaćeno / delimično / plaćeno.
- **Dugovanja mušterija**: ko, koliko, od kada.
- **Troškovi** (delovi, materijal, kirija, struja, plate, porezi, knjigovođa, ostalo) i **investicije** (alat, oprema i uređaji, uređenje radionice, ostalo): datum, iznos, opis, opciono nalog, dobavljač, plaćeno da/ne, rok, broj računa, napomena. Trošak za konkretan auto se dodaje sa naloga.
- **Dobavljači**: naziv, telefon, email, napomena; na dobavljaču: neplaćeni troškovi i narudžbenice.
- **Pregled po periodu** (ovaj mesec, prošli mesec, 90 dana, godina, od–do): prihodi − troškovi = profit; profit − investicije = saldo. Ispod: završeni nalozi sa iznosom, troškovima i zaradom po nalogu. Dugovanja mušterija i prema dobavljačima. Izvoz u Excel/CSV.
- Zarada po nalogu = iznos naloga − troškovi vezani za taj nalog. Nabavna cena po stavci se više ne vodi.

### 2.8. Narudžbenica za dobavljača
- Šalje se zastupniku u firmi za delove. Pravi se iz naloga (ili samostalno): dobavljač, vozilo (marka, model, godište, motor, snaga u kW, gorivo, VIN), delovi po nazivu sa količinom i napomenom (bez kataloškog broja), „treba nam do“ datum, napomena.
- Izlaz: **PDF** (preuzmi ili „Podeli“ sa telefona u Viber/WhatsApp/email) i **link** `/n/<token>` koji dobavljač otvara bez prijave.
- Status: poslato → stiglo (delimično ili sve). Dok nije stiglo, nalog pokazuje „čeka deo“. Kad stigne, jednim klikom se stavke prebacuju u nalog kao delovi sa nabavnom cenom i opciono pravi trošak ka dobavljaču.

### 2.9. Deljivi karton za mušteriju
- Na vozilu ili nalogu: „Podeli“ → lista sa štiklicama: koji nalozi, da li se vide cene, koje fotografije, da li se vide podsetnici. Ništa nije čekirano što majstor nije izabrao.
- Link, rok važenja (podrazumevano 90 dana), opoziv, brojač otvaranja. PIN je odložen: link je dovoljno zaštićen, a PIN dodaje korak mušteriji.
- „Podeli“ sa telefona (Web Share → Viber/WhatsApp/SMS) ili kopiraj poruku.
- Javna strana: naziv i telefon servisa, vozilo, čekirani nalozi, fotografije, podsetnici. Bez indeksiranja, bez kolačića.

### 2.10. Početna
- U radu, čeka deo, završeno a nepreuzeto/neplaćeno, današnji termini, podsetnici koji dospevaju, poslednji nalozi. Veliko dugme „Novi prijem“.

### 2.11. Podešavanja
- Podaci radnje se upisuju u kodu (`src/config/shop.ts`), bez ekrana za izmenu. Naziv: „Automehaničar Janković“. Bez teksta o PDV-u na ekranu i na štampi.
- Instalacija aplikacije na telefon (PWA) i odjava uređaja.

### 2.12. Nije u obimu
Uloge i korisnici · PDV i fiskalizacija · SEF · digitalna inspekcija · predračun sa odobrenjem preko linka · katalog i magacin · slanje SMS/Viber iz sistema (sledeća verzija, podsetnici su spremni za to) · izveštaji preko pregleda iz 2.7 · ćirilica i engleski · uvoz iz Excela · offline rad · garancije i reklamacije · više lokacija ili servisa.

## 3. Tehnička rešenja

| Tema | Odluka | Zašto |
|---|---|---|
| Aplikacija | Next.js (App Router, TypeScript strict), Tailwind, shadcn/ui, react-hook-form + zod | Tvoj default stack; jedan kod za mobilni i desktop |
| Struktura | Jedan Next.js projekat: `src/app` (ekrani), `src/server` (baza, use-case funkcije), `src/domain` (čista logika sa testovima), `src/components` | Monorepo nema smisla za ovaj obim |
| Baza | Postgres na Supabase (EU) kroz **Drizzle ORM** i direktnu konekciju; migracije Drizzle Kit | Bez Supabase Auth i RLS nema razloga za supabase-js; Drizzle daje tipove i migracije u repou |
| Fotografije | Supabase Storage, privatan bucket, potpisani URL-ovi; kompresija na telefonu pre slanja (2048 px, ≤ 600 KB, bez GPS-a) | Isti provajder kao baza; besplatno za ovaj obim |
| Pristup | Lozinka iz env promenljive (argon2 heš), httpOnly cookie 365 dana, middleware štiti sve osim `/k`, `/n`, `/login` | Minimum koji razdvaja servis od mušterija |
| Tokeni linkova | 24 bajta slučajnosti, u bazi SHA-256 heš, PIN kao argon2 | Preuzeto iz spec 9.7 |
| PDF | `@react-pdf/renderer` na serveru (bez Chromiuma, radi na Vercelu); isti podaci za štampu iz browsera | Narudžbenica i račun moraju da budu fajl koji se šalje sa telefona |
| Novac | `NUMERIC(12,2)`, obračun u `src/domain` sa `decimal.js`, bez PDV-a | Zaokruživanje po stavci, zbir iz zaokruženih |
| Grafikon km | `recharts`, jedna linija | |
| Hosting | Vercel (region `fra1`) + Supabase Frankfurt | Oba naloga praviš ti; ja dobijam env vrednosti u `.env.local` |
| Backup | Supabase dnevni backup (free tier čuva 7 dana) + nedeljni izvoz iz podešavanja kao navika | Dovoljno za ovaj obim; nadogradnja ako podaci porastu |
| Testovi | vitest za `src/domain` (obračun, normalizacija tablice i telefona, VIN, projekcija podsetnika), Playwright za tri toka (prijem, završetak sa uplatom, deljenje linka) | |
| Zavisnosti | pnpm, `minimumReleaseAge: 10080`, `strictDepBuilds: true`, Dependabot | Tvoja pravila |

Model podataka (tabele): `customer`, `customer_phone`, `vehicle`, `odometer_reading`, `service_order`, `order_item`, `payment`, `reminder`, `appointment`, `supplier`, `expense`, `parts_order`, `parts_order_item`, `attachment`, `share_link`, `settings`. Svaka ima `tenant_id` sa fiksnom vrednošću, da SaaS kasnije ne traži migraciju.

## 4. Iteracije

Svaka se završava ekranom koji pregledaš u browseru (desktop i 360 px) i commit-om uz tvoj OK.

### Iteracija 0 — Skelet
- pnpm, Next.js, Tailwind, shadcn/ui, Drizzle, šema svih tabela i prva migracija, lozinka i sesija, layout (leva traka / donja traka), dizajn tokeni iz `brand/BRENDING.md` (charcoal, plava, crvena; Montserrat + Inter), favicon i PWA ikonice iz `brand/icon-j.svg`, seed sa test podacima, GitHub Actions (lint, typecheck, test).
- Done: prijava radi, prazna početna sa navigacijom, migracija primenjena na Supabase.
- **Status 28.10.2026.** Urađeno: pnpm 12 sa bezbednosnim pravilima, Next 16.4.2, Tailwind 4, shadcn/ui (Radix), brend tokeni i fontovi, ikonice i PWA manifest, prijava lozinkom (scrypt + potpisan kolačić 365 dana, `proxy.ts` + provera u layout-u), izgled za desktop i telefon, prazni ekrani svih sekcija, bezbednosna zaglavlja, CI i Dependabot. `pnpm audit`: bez nalaza. **Čeka:** Drizzle, šema, migracija i seed (treba Supabase projekat i odobrenje paketa van osnovnog steka); trajno zaključavanje prijave posle 5 pogrešnih pokušaja ide u bazu kad ona postoji.

### Iteracija 1 — Klijenti, vozila, karton
- CRUD klijenata i vozila, pretraga (tablica, ime, telefon), karton sa praznom istorijom, grafikon km, promena vlasnika.
- `src/domain`: normalizacija tablice i telefona, VIN provera, obračun stavki, projekcija km. Testovi.
- **Status 28.10.2026.** Urađeno bez baze: podaci se privremeno čuvaju u `.data/dev-db.json` (samo lokalno; na Vercelu namerno javlja grešku) iza istih use-case funkcija koje će pisati u Postgres. Klijenti (lista, pretraga, novi, profil, izmena, arhiva, upozorenje na duplikat), vozila (lista, novo vozilo sa novim ili postojećim vlasnikom, izmena, arhiva, sukob tablice/VIN-a), karton (kilometraža sa trendom, projekcijom i grafikonom, upis i brisanje očitavanja, vlasnici, podaci), promena vlasnika (prodaja i ispravka greške), globalna pretraga Ctrl+K. Bez paketa van osnovnog steka: testovi na `node:test` (51 test, 100 % linija u domain sloju), novac u celim parama, forme kroz server akcije, grafikon kao SVG. Test podaci: `pnpm seed`. **Čeka bazu:** prelazak skladišta na Postgres i provera „ispravke vlasnika“ kad postoje nalozi.

### Iteracija 2 — Nalozi
- Prijem, stavke sa autocomplete-om, fotografije (upload pipeline), završetak sa podsetnicima, lista, karton dobija istoriju, dokumenti: predračun, radni nalog, račun (PDF + štampa).
- **Status 28.10.2026.** Urađeno: prijem na jednom ekranu (pretraga vozila uživo, novo vozilo i novi klijent u istoj transakciji, vlasnik iz kartona, brzi razlozi), brojevi naloga po godini, stavke (rad/deo/materijal, predlozi sa poslednjom cenom iz ranijih naloga, popust, kataloški broj, nabavna cena i zarada na zahtev), tekstovi naloga, fotografije (smanjenje u browseru, privatno lokalno skladište, sličice, uvećanje, brisanje), završetak sa podsetnicima „šta pre nastupi“ i zatvaranjem ranijih, vraćanje u rad (poništava posledice završetka), otkazivanje sa razlogom, lista sa filterima, istorija i galerija na kartonu, nalozi na profilu klijenta, početna (u radu, podsetnici, registracije), strana Podsetnici, predračun i radni nalog za štampu/PDF. 71 test. **Pomereno u Iteraciju 3:** račun, jer traži sopstveni broj i zamrzavanje stavki zajedno sa uplatama. **Čeka:** podatke radnje za dokumente (placeholderi u `src/config/shop.ts`), Supabase Storage za fotografije.

### Iteracija 3 — Finansije i dobavljači
- Uplate i dugovanja, troškovi sa fotografijom računa, dobavljači, pregled po periodu sa izvozom, narudžbenica sa PDF-om i linkom `/n/<token>`, prijem robe u nalog, „čeka deo“.
- **Status 28.10.2026.** Urađeno: uplate na nalog (gotovina/kartica/račun, delimične, avans, poništavanje uz razlog), status naplate, račun (nefiskalni, broj R-GGGG-NNNN, zamrznut snimak, poništavanje; nalog se ne vraća u rad dok je račun važeći), dugovanja po klijentu sa starošću, finansije klijenta, troškovi fiksni/varijabilni sa plaćeno/rok, dobavljači (dug prema dobavljaču, računi, narudžbenice), narudžbenica (javni link sa heširanim tokenom i brojačem otvaranja, PDF, prijem robe u nalog sa dopunom postojeće stavke, trošak ka dobavljaču, „čeka deo“ na nalogu i početnoj), pregled perioda (naplaćeno, fiksni, varijabilni, razlika, fakturisano, zarada), CSV za Excel (nalozi, uplate, troškovi), 404 strane. 90 testova. **Nije urađeno:** fotografija računa dobavljača uz trošak (dolazi sa Supabase Storage). **Čeka:** knjigovođa da potvrdi izgled računa i CSV formata.

### Iteracija 4 — Kalendar, deljenje, početna, isporuka
- Kalendar i prijem iz termina, podsetnici (lista, dospeće, akcije), deljivi karton sa izborom i javna strana `/k/<token>`, početna, podešavanja, izvoz podataka, Playwright tokovi, deploy na Vercel.
- **Status 28.10.2026 (kalendar).** Urađeno: termini (datum, vreme na 15 min, trajanje, vozilo iz evidencije ili samo tekst, postojeći klijent ili ime i telefon, razlog, napomena), pogled nedelje (lista na telefonu, 7 kolona na desktopu) i dana (mreža 7–19 h, termini koji se preklapaju stoje jedan pored drugog, klik na prazno polje otvara novi termin u tom vremenu), upozorenje na preklapanje bez blokiranja, statusi zakazan/došao/nije došao/otkazan, izmena i pomeranje, brisanje (osim primljenih), „Prijem“ iz termina popunjava prijem i vezuje termin za nalog, „Danas dolaze“ na početnoj, „Zakaži“ sa kartona vozila i iz podsetnika, „Zakazano“ na kartonu. 99 testova. **Deljivi karton** je završen 29.10.2026.
- **Status 29.10.2026 (PDF kartona).** Uz link za mušteriju pravi se i PDF iz istog snimka (`/api/podeli/<id>/pdf`, samo prijavljen majstor; radi i za istekao ili ugašen link). Na telefonu „Pošalji PDF“ šalje fajl direktno (Viber, WhatsApp), na računaru se PDF otvara. U listi poslatog svaki link ima dugme PDF. Paket `@react-pdf/renderer` 4.9.0 (odobren), font Inter 4.1 (OFL) u `assets/fonts`. 108 testova.
- **Status 29.10.2026 (vizuelni stil).** Flat, za dodir: tamnije ivice kartica (#cfd2d8) i polja (#85878d, 3,6:1), tamniji sekundarni tekst (#4f5054, 7,4:1), placeholder ostaje svetliji. Bez senki osim dijaloga. Veliki iznosi (Duguje, Ukupno, Profit, Saldo 26–30 px). Kartice brojača na Početnoj: ikona, veliki broj u boji, opis. Tabovi finansija i dobavljača kao segmentirana traka, izabrano plavo. Podrazumevano dugme 44 px, zatvaranje dijaloga 44 px. Ugrađene kontrole prate temu uređaja.
- **Status 29.10.2026 (izmene po povratnoj informaciji).** Naziv „Automehaničar Janković“ svuda, i u podnaslovu logoa. Izbačen tekst o PDV-u sa ekrana i štampe. Uplate bez načina plaćanja. Finansije: troškovi i investicije, profit i saldo za period, troškovi i zarada po nalogu, nabavna cena po stavci uklonjena. Narudžbenica za zastupnika: blok sa autom (godište, motor, kW, gorivo, VIN), delovi samo po nazivu i količini. Vozilo dobilo polje „Snaga (kW)“. UX: uklonjeni opisi ispod naslova i objašnjavajući tekstovi, polja visine 48 px, kategorije troška kao dugmad, detalji ispod „Dobavljač i račun“. PWA: service worker bez keširanja podataka, strana „Nema interneta“, dugme za instalaciju i prečice u manifestu. 107 testova.
- **Status 29.10.2026 (deljivi karton).** Urađeno: „Podeli“ na kartonu vozila i na nalogu (nalog sa kog se došlo je čekiran), izbor naloga, fotografija uz izabrane naloge, cena i podsetnika, rok 30/90/365 dana (podrazumevano 90), link sa slanjem preko Vibera/WhatsAppa/SMS-a ili kopiranjem poruke, lista linkova sa brojačem otvaranja i gašenjem. Link je zamrznut snimak u trenutku deljenja; token se čuva samo kao heš. Javna strana `/k/<token>`: vozilo, sledeći servis, radovi, delovi, cene samo ako su izabrane, fotografije preko tokena; bez imena i telefona klijenta, VIN-a, nabavnih cena, internih napomena i dugovanja; bez indeksiranja, keša i Referer-a. Pregled prijavljenog majstora se ne broji kao otvaranje. 107 testova. **Odluke:** bez PIN-a i bez odobravanja predračuna preko linka u prvoj verziji. **Ostaje u Iteraciji 4:** podešavanja radnje, izvoz podataka, Playwright (čeka odobrenje paketa), deploy (čeka bazu).

Procena: 5 do 6 sesija rada.

## 5. Šta mi treba od tebe

1. Supabase nalog i projekat u Frankfurtu: Project URL, database password (za Drizzle konekciju), service key za Storage. Stavljam ih u `.env.local` koji je u `.gitignore`.
2. Vercel nalog kad dođe Iteracija 4.
3. Adresa i telefon radnje za dokumente (logo i boje su spremni u `brand/`; može placeholder do tada).
4. Lozinka za servis biraš ti pri prvom deploy-u; u razvoju je test vrednost u seed-u.

## 6. Otvoreno, ali ne blokira

- Naziv dokumenta „Račun“ za nefiskalni dokument i obavezni elementi: proveriti sa njihovim knjigovođom pre produkcije.
- SMS podsetnici: provajder i cena odlučuju se u sledećoj verziji; model ih već podržava.
- Da li dva majstora žele da se vidi ko je radio nalog: dodajem jednostavno polje „radio“ sa izborom iz dva imena u podešavanjima, bez prijave po osobi.
