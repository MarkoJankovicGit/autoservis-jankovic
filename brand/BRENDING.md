# Brending — Automehaničar Janković

Izvor: `autoservis jankovic 1.pdf` (Adobe Illustrator 24.1, 31.10.2023). Originalni fajl se ne menja; sve varijante ispod su izvedene iz njegovih vektora skriptom `build_brand.py`.

## 1. Nalaz u originalnom logou

Podnaslov u originalu glasi **„AUTOMEHANIČARKSA RADNJA“** (zamenjena slova K i S). Ispravno je „AUTOMEHANIČARSKA RADNJA“.

- U svim fajlovima u ovom folderu podnaslov je ispravljen zamenom mesta glifova K i S iz istog fonta, sa istim razmakom. Ostatak logoa je netaknut.
- Od 29.10.2026. naziv radnje je „Automehaničar Janković“, pa podnaslov glasi samo **„AUTOMEHANIČAR“**. Skripta zadržava prvu reč iz originalnih glifova i centrira je na mesto celog podnaslova (`SUBTITLE` u `build_brand.py`).
- Preporuka: proveriti tablu, vizitkarte, nalepnice i društvene mreže, jer verovatno nose istu grešku. Izvorni `.ai` fajl treba ispraviti kod dizajnera.

## 2. Fajlovi

| Fajl | Namena |
|---|---|
| `logo-dark.svg` | Original na charcoal pozadini, kao u PDF-u. Za login ekran i deljive strane. |
| `logo-on-dark.svg` | Isti logo bez pozadine. Za bočnu traku i zaglavlje aplikacije na tamnoj podlozi. |
| `logo-light.svg` | Za belu podlogu: silueta, luk i slova u charcoal boji, plavi i crveni segmenti ostaju. Za PDF dokumente u boji. |
| `logo-mono.svg` | Crno-bela verzija za laserski štampač: segmenti u nijansama sive. |
| `icon-j.svg` | Ikonica aplikacije: slovo J iz logoa u srebrnom gradijentu. Favicon, PWA ikonica, ikonica na telefonu. |
| `icon.svg` | Alternativa sa brzinomerom. Ne preporučuje se: na 32 px se ne čita. |
| `preview.html` | Pregled svih varijanti na tamnoj i beloj podlozi. |
| `_gradients.json` | Tačne boje četiri gradijenta iz originala (CMYK konvertovan u RGB). |
| `build_brand.py` | Ponovno generisanje: `python -I build_brand.py "../autoservis jankovic 1.pdf" .` |

PNG verzije (192, 512, 180 za iOS, favicon) generišu se u Iteraciji 0 iz `icon-j.svg`, kroz alat koji Next.js već koristi za slike.

## 3. Boje

Boje iz logoa:

| Token | Hex | Poreklo |
|---|---|---|
| `brand-charcoal` | `#3E3E3F` | Pozadina logoa |
| `brand-red` | `#E7232F` | Igla brzinomera |
| `brand-blue-dark` | `#185E93` | Sredina tamnoplavog gradijenta |
| `brand-blue-light` | `#4995CE` | Sredina svetloplavog gradijenta |
| `brand-silver` | `#A3A0A3` | Srebrni gradijent (raspon `#5F6060` do `#B7B6B7`) |

Upotreba u aplikaciji, sa proverenim kontrastom (WCAG AA traži najmanje 4,5 za tekst):

| Uloga | Boja | Kontrast | Pravilo |
|---|---|---|---|
| Primarno dugme, link | `#185E93`, hover `#145383` | 6,9 beli tekst | Jedina akcentna boja za akcije |
| Opasnost, dug, kašnjenje | `#C81E28` | 5,7 na belom | `#E7232F` samo dekorativno; beli tekst na njoj je 4,49 i pada ispod praga |
| Bočna traka, zaglavlje | `#3E3E3F` | | Tekst `#F9F9FA` (10,2), sekundarni tekst `#C9C8CA` (6,4) |
| Pozadina sadržaja | `#F4F5F7`, kartice `#FFFFFF` | | |
| Tekst | `#1E1E20`, sekundarni `#6B6B6E` | 5,3 na belom | |
| Uspeh, plaćeno | `#1F7A44` | 5,4 na belom | |
| Upozorenje, uskoro dospeva | `#A15C00` | 5,2 na belom | |
| Tamna tema: pozadina | `#1E1E20`, površine `#2E2E30` | | Plava za tekst `#7FB9E5` (6,8), crvena `#EF4E5B` samo za velike elemente (4,0) |

Svetloplava `#4995CE` i srebrna nisu za tekst na charcoal pozadini (3,3 i 4,1). Koriste se za ikone i ukrase.

## 4. Fontovi

- **Montserrat**: font iz logoa. Podnaslov je Montserrat Regular sa širokim razmakom; „JANKOVIĆ“ je po obliku Montserrat ExtraBold Italic pretvoren u krive.
- Predlog za aplikaciju: **Montserrat SemiBold** za naslove ekrana, dugmad i registarske tablice; **Inter** za tekst, tabele i iznose, jer je čitljiviji u gustim listama i ima cifre iste širine.
- Oba su na Google Fonts pod OFL licencom. Next.js ih hostuje sam, bez poziva ka Google-u iz browsera.

## 5. Primena

- Aplikacija: charcoal bočna traka na desktopu sa `logo-on-dark.svg`, svetao sadržajni deo. Na mobilnom charcoal gornja traka sa `icon-j.svg` i nazivom.
- Login: pun ekran `#3E3E3F`, `logo-dark.svg` centriran.
- Deljivi karton i narudžbenica: charcoal zaglavlje sa logom, bela kartica sa sadržajem.
- PDF dokumenti: `logo-light.svg` gore levo, podaci radnje desno. Bez tamnih traka, da štampač ne troši toner.
- Logo se ne razvlači, ne menja mu se boja i ne stavlja se na fotografiju bez tamne podloge.
- Najmanja širina celog logoa: 140 px na ekranu, 35 mm na papiru. Ispod toga ide samo `icon-j.svg`.
