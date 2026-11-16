/* =====================================================================
   SHAHI Küche – zentrale Daten
   ---------------------------------------------------------------------
   Diese Datei enthält ALLE Inhalte, die sich regelmäßig ändern können:
   Betriebsmodus (Eröffnung), Restaurant- und Betreiberdaten, Öffnungszeiten,
   Lieferkonditionen, Zahlung, Steuer, Kategorien und Gerichte.
   Aufbau wie bei MINAR (menu-data.js); Layout und Logik (styles.css, app.js)
   müssen für Preis- oder Gerichtsänderungen nicht angefasst werden.

   Quelle: zwei Fotos des gedruckten SHAHI-Küche-Flyers, digitalisiert am
   15.11.2026 (bisherige SHAHI-Website), migriert am 16.11.2026 mit
   tools/migration/shahi-v1-zu-menu-data.mjs. Offene Punkte stehen bei den
   Gerichten unter „checks“ und gesammelt in docs/FREIGABELISTE.md.

   Werte mit null sind vom Betreiber noch nicht bestätigt.

   ---------------------------------------------------------------------
   Aufbau eines Gerichts:

   {
     id: "pizza-salami",          // feste Kennung (Kleinbuchstaben, Ziffern, -) – nicht ändern,
                                  //   der gespeicherte Warenkorb bezieht sich darauf
     nr: "106",                   // Artikelnummer laut Flyer (Text), Getränke ohne Nummer
     cat: "pizza",                // id aus "categories"
     name: "Salami",
     flyerName: "…",              // nur, wenn der Flyer anders schreibt (Dokumentation)
     desc: "Beschreibung laut Flyer",
     prices: [9.4]                // ein Preis in Euro …
     prices: [["klein", 4.9], ["groß", 6.9]],          // … oder Größen/Varianten
     prices: [["0,33 l", 2.25, 330]],                    // Getränke: 3. Wert = Füllmenge in ml (Grundpreis je Liter)
     codes: "A,G,6,7",            // Kennzeichnung exakt wie auf dem Flyer:
                                  //   Buchstaben = Allergene, Zahlen = Zusatzstoffe
     opts: ["nudel-sorte"],       // Auswahl/Extras aus "optionGroups"
     tags: ["vegetarisch"],       // nur, wenn der Flyer es so benennt ("vegetarisch", "scharf")
     pfand: 0.25,                 // Getränkepfand je Stück in € (separat ausgewiesen); 0 = kein Pfand,
                                  //   null = unbekannt → online nicht bestellbar
     tax: "getraenke",            // Steuerart, sonst von der Kategorie ("speisen" = 7 %, "getraenke" = 19 %);
                                  //   { split: true, drinkShare: 2.5 } = Kombiangebot mit Getränkeanteil in €
     checks: [{ field: "pfand", note: "…", blocks: true }]   // offene Prüfpunkte; blocks = im Livebetrieb
                                  //   online nicht bestellbar, bis der Punkt gelöscht ist
   }
   ===================================================================== */

window.SHAHI_DATA = {
  /* --- Betrieb ---------------------------------------------------------
     mode: "vor-eroeffnung" = Speisekarte sichtbar, keine Bestellanfragen möglich
           "geoeffnet"      = Normalbetrieb (Online-Bestellung nur, wenn Betreiber-
                              angaben, Zahlungsarten und Steuerstatus vollständig sind)
     blockChecks: true = Gerichte/Optionen mit sperrenden Prüfpunkten sind im
                  Normalbetrieb nicht online bestellbar („gerne telefonisch“)      */
  operation: {
    mode: "vor-eroeffnung",
    openingDate: null,
    preOpeningText: "Wir bereiten gerade die Eröffnung vor. Die Speisekarte können Sie schon ansehen – bestellen können Sie, sobald wir geöffnet haben.",
    blockChecks: true,
    indexable: false,
    orderModel: "verbindlich",
    cartHours: 12,
    maxQty: 50,
    messageWarnLength: 3500
  },

  /* --- Restaurant und Betreiber (Impressum) --- */
  restaurant: {
    name: "SHAHI Küche",
    street: "Bachgasse 17",
    zip: "88400",
    city: "Biberach an der Riß",
    cityShort: "Biberach",
    phoneDisplay: "07351 347 04 00",
    phoneLink: "+4973513470400",
    phonePurpose: "Bestellungen & Fragen",
    phonesMore: [{ display: "07351 347 04 03", link: "+4973513470403", purpose: "" }, { display: "07351 347 04 04", link: "+4973513470404", purpose: "" }],
    whatsappDisplay: "0179 69 500 47",
    whatsappNumber: "491796950047",
    testMode: false,
    testWhatsappNumber: "",
    cartDrawer: true,
    email: null,
    fax: null,
    owner: null,
    legalForm: null,
    representative: null,
    vatId: null,
    economicId: null,
    register: null,
    supervisoryAuthority: null,
    disputeResolution: null,
    responsibleContent: null,
    googleReviewUrl: "",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Bachgasse%2017%2C%2088400%20Biberach%20an%20der%20Ri%C3%9F",
    website: "https://www.shahi-biberach.de",
    offer: ["Abholung", "Lieferservice"]
  },

  /* --- Zahlung: methods z. B. ["bar"] oder ["bar", "Karte bei Lieferung"]; note = Satz für Warenkorb/Bon --- */
  payment: { methods: null, note: null },

  /* --- Umsatzsteuer (vom Betreiber mit der Steuerberatung zu bestätigen) ---
     status "bestaetigt" + smallBusiness false + show true → enthaltene USt. im Bon ausweisen;
     smallBusiness true → Hinweis nach § 19 UStG. Preise sind immer Endpreise (brutto). */
  tax: { status: "zu-pruefen", smallBusiness: null, rates: { food: 7, drinks: 19 }, deliveryFee: "anteilig", deposit: "wie-getraenk", show: false },

  menuSource: "Alle Preise in Euro. Getränkepfand und Lieferkosten werden im Warenkorb gesondert ausgewiesen.",

  /* --- Öffnungszeiten (laut Flyer, vom Betreiber zu bestätigen) ---
     week: 0 = Sonntag, 1 = Montag … 6 = Samstag; mehrere Zeitfenster je Tag möglich, [] = Ruhetag
     orderUntil: Bestellannahmeschluss je Bestellart · lead: Mindestvorbereitungszeit in Minuten
     latestWish: späteste Wunschzeit · slot: Zeitraster der Wunschzeit
     exceptions: Sonderöffnungszeiten   { date: "2026-12-24", closed: true, note: "Heiligabend geschlossen" }
                                        { date: "2026-12-31", times: [["11:00", "18:00"]], orderUntil: "17:30", note: "Silvester" }
     holidays:   Betriebsferien         { from: "2027-01-07", to: "2027-01-20", note: "Betriebsferien" }
     closures:   kurzfristige Schließung { from: "2026-12-01T18:00", to: "2026-12-01T20:00", note: "…" }
     pause:      manuelle Bestellpause  { active: true, note: "Gerade sehr viel los – bitte telefonisch bestellen." } */
  hours: {
    timezone: "Europe/Berlin",
    week: { "0": [["11:00", "22:30"]], "1": [["16:30", "22:30"]], "2": [], "3": [["16:30", "22:30"]], "4": [["16:30", "22:30"]], "5": [["11:00", "22:30"]], "6": [["11:00", "22:30"]] },
    orderUntil: { pickup: "22:15", delivery: "22:15" },
    lead: { pickup: 20, delivery: 30 },
    latestWish: { pickup: "22:30", delivery: "22:30" },
    slot: 15,
    exceptions: [],
    holidays: [],
    closures: [],
    pause: { active: false, note: "" },
    deliveryTimeNote: "Wir bereiten alle Speisen frisch zu. Die Lieferzeit beträgt je nach Entfernung etwa 20–90 Minuten – das ist ein Richtwert, keine Zusage.",
    confirmed: { times: false, lead: false, latestWish: false }
  },

  /* --- Lieferung (Mindestbestellwert und Lieferkosten laut Flyer) ---
     Online wählbar sind nur Orte mit confirmed: true. Die Zuordnung der Orte zu den
     Entfernungszonen muss der Betreiber bestätigen (keine automatische Entfernungsberechnung). */
  delivery: {
    pickup: true,
    delivery: true,
    zones: [
      { id: "biberach", name: "Biberach", minOrder: 15, fee: 1, places: [
        { name: "Biberach an der Riß", zip: "88400", confirmed: false },
        { name: "Biberach-Rißegg", zip: "88400", confirmed: false },
        { name: "Biberach-Mettenberg", zip: "88400", confirmed: false },
        { name: "Biberach-Ringschnait", zip: "88400", confirmed: false },
        { name: "Biberach-Stafflangen", zip: "88400", confirmed: false }
      ] },
      { id: "bis7", name: "bis 7 km", minOrder: 25, fee: 2, places: [
        { name: "Warthausen", zip: "88447", confirmed: false },
        { name: "Mittelbiberach", zip: "88441", confirmed: false },
        { name: "Ummendorf", zip: "88444", confirmed: false }
      ] },
      { id: "7bis12", name: "7 bis 12 km", minOrder: 45, fee: 3, places: [
        { name: "Hochdorf", zip: "88454", confirmed: false },
        { name: "Maselheim", zip: "88437", confirmed: false },
        { name: "Schemmerhofen", zip: "88433", confirmed: false },
        { name: "Attenweiler", zip: "88448", confirmed: false },
        { name: "Steinhausen an der Rottum", zip: "88416", confirmed: false },
        { name: "Ingoldingen", zip: "88456", confirmed: false },
        { name: "Eberhardzell", zip: "88436", confirmed: false }
      ] }
    ],
    notes: [
      "Der Mindestbestellwert bezieht sich auf den Warenwert – ohne Lieferkosten und Pfand.",
      "Sie erreichen den Mindestbestellwert nicht? Rufen Sie uns an oder schreiben Sie uns per WhatsApp.",
      "Die Lieferung erfolgt ohne Teller, Besteck und Dekoration."
    ]
  },

  /* --- Legende (laut Flyer) --- */
  legend: {
    allergens: {
      "A": "Glutenhaltiges Getreide und daraus hergestellte Erzeugnisse",
      "B": "Krebstiere und daraus hergestellte Erzeugnisse",
      "C": "Eier und daraus hergestellte Erzeugnisse",
      "D": "Fisch und daraus hergestellte Erzeugnisse",
      "E": "Erdnüsse und daraus hergestellte Erzeugnisse",
      "F": "Soja und daraus hergestellte Erzeugnisse",
      "G": "Milch und daraus hergestellte Erzeugnisse (laktosehaltig)",
      "H": "Schalenfrüchte (Nüsse)",
      "J": "Senf und daraus hergestellte Erzeugnisse",
      "K": "Sesamsamen und daraus hergestellte Erzeugnisse",
      "L": "Schwefeldioxid und Sulfite",
      "N": "Weichtiere",
      "O": "Koffein"
    },
    additives: {
      "1": "Verdickungsmittel",
      "2": "Farbstoffe",
      "3": "Konservierungsstoffe",
      "4": "Säuerungsmittel",
      "5": "Antioxidationsmittel",
      "6": "Geschmacksverstärker",
      "7": "Phosphat",
      "8": "Emulgator",
      "9": "geschwärzt"
    },
    notes: [
      "Käse: Konservierungsstoffe, Farbstoffe, Nitrat, Natamycin.",
      "Hackfleisch: reines Rinderhack. Schinken: Putenschinken.",
      "Fehlt bei einem Gericht eine Kennzeichnung, heißt das nicht, dass es frei von Allergenen ist. Bei Allergien oder Unverträglichkeiten fragen Sie bitte vor der Bestellung nach."
    ]
  },

  /* --- Auswahl- und Zusatzoptionen ---
     type "one"  = genau eine Auswahl (optional: true = mit neutraler Wahl wie „ohne Beilage“)
     type "many" = beliebig viele; max: n begrenzt, min: n = Pflichtanzahl (unit = Bezeichnung im Hinweis)
     Option: name, price (Aufpreis in €), codes (Allergene/Zusatzstoffe), neutral (nicht im Bon aufführen) */
  optionGroups: {
    "salat-dressing": { label: "Dressing", type: "one", options: [{ id: "essig-oel", name: "Essig und Öl" }, { id: "joghurt", name: "Joghurtsoße", codes: "C,G" }] },
    "burger-beilage": { label: "Beilage dazu", type: "one", optional: true, options: [{ id: "ohne", name: "ohne Beilage", neutral: true }, { id: "pommes", name: "mit Pommes", price: 3.5 }, { id: "wedges", name: "mit Wedges", price: 3.5 }], checks: [{ note: "Der Block „Extra Zusatz“ steht im Flyer direkt unter den Burgern. Bitte bestätigen, dass Pommes/Wedges (+3,50 €) für alle Burger 20–39 gelten.", blocks: true }] },
    "burger-extras": { label: "Extra Zusatz", type: "many", options: [{ id: "jalapenos", name: "Jalapeños", price: 0.5 }, { id: "roestzwiebeln", name: "Röstzwiebeln", price: 0.5 }, { id: "spiegelei", name: "Spiegelei", price: 1 }, { id: "kaese", name: "Käse", price: 1 }, { id: "fleisch-patty", name: "Fleisch-Patty", price: 5 }, { id: "kaesespaetzle", name: "Käsespätzle", price: 7 }], checks: [{ note: "Gültigkeit der Extras für alle Burger 20–39 bestätigen. Im Flyer stehen für die Extras keine Allergen-/Zusatzstoffkennzeichnungen (z. B. Spiegelei, Käse, Käsespätzle) – bitte ergänzen.", blocks: true }] },
    "platte-beilage": { label: "Beilage", type: "one", options: [{ id: "pommes", name: "Pommes" }, { id: "wedges", name: "Wedges" }] },
    "platte-burger": { label: "Burger", type: "one", options: [{ id: "hamburger", name: "Hamburger" }, { id: "chicken-burger", name: "Chicken Burger" }] },
    "menue-burger": { label: "Burger", type: "one", options: [{ id: "nr20", name: "Nr. 20 Hamburgerle" }, { id: "nr21", name: "Nr. 21 Cheeseburgerle", codes: "2" }, { id: "nr23", name: "Nr. 23 Chickenburgerle" }] },
    "dip-sorte": { label: "Sorte", type: "one", options: [{ id: "ketchup", name: "Ketchup" }, { id: "mayo", name: "Mayo" }, { id: "remoulade", name: "Remoulade" }] },
    "beilage-pwr": { label: "Beilage", type: "one", options: [{ id: "pommes", name: "Pommes" }, { id: "wedges", name: "Wedges" }, { id: "reis", name: "Reis" }] },
    "nudel-sorte": { label: "Nudeln", type: "one", options: [{ id: "spaghetti", name: "Spaghetti" }, { id: "penne", name: "Penne" }] },
    "nudel-ueberbacken": { label: "Überbacken", type: "many", options: [{ id: "ueberbacken", name: "überbacken", price: 2.5, codes: "G" }] },
    "partypizza-belaege": { label: "Vier Beläge nach Wahl", short: "Beläge", type: "many", min: 4, max: 4, unit: "Beläge", unitOne: "Belag", options: [{ id: "salami", name: "Salami" }, { id: "schinken", name: "Schinken" }, { id: "sucuk", name: "Sucuk" }, { id: "hackfleisch", name: "Hackfleisch" }, { id: "drehspiess", name: "Hackfleischdrehspieß" }, { id: "chicken", name: "Chicken" }, { id: "champignons", name: "Champignons" }, { id: "paprika", name: "Paprika" }, { id: "peperoni", name: "Peperoni" }, { id: "jalapenos", name: "Jalapeños" }, { id: "zwiebeln", name: "Zwiebeln" }, { id: "mais", name: "Mais" }, { id: "brokkoli", name: "Brokkoli" }, { id: "spinat", name: "Spinat" }, { id: "artischocken", name: "Artischocken" }, { id: "oliven", name: "Oliven", codes: "9" }, { id: "kapern", name: "Kapern" }, { id: "ananas", name: "Ananas" }, { id: "tomaten", name: "Tomaten" }, { id: "ei", name: "Ei" }, { id: "weichkaese", name: "Weichkäse" }, { id: "mozzarella", name: "Mozzarella" }, { id: "knoblauch", name: "Knoblauch" }], checks: [{ note: "Der Flyer nennt „vier Beläge nach Wahl“, aber keine Belagliste. Vorschlag: Beläge aus der Pizzakarte ohne Fisch/Meeresfrüchte (Nr. 136 ist nicht mit D gekennzeichnet). Liste und Kennzeichnung (z. B. Oliven „9“) bitte bestätigen.", blocks: true }] }
  },

  /* --- Kategorien (Reihenfolge wie auf dem Flyer) ---
     slug = Dateiname der Unterseite: speisekarte/<slug>.html
     img  = Bild aus assets/images/ (derzeit eigene Illustrationen, keine Produktfotos)
     seo  = Seitentitel und Beschreibung der Kategorieseite
     Neue Kategorie → danach `node tools/build.mjs` ausführen.        */
  categories: [
    { id: "salate", slug: "salate", name: "Salate", desc: "Wahlweise mit Essig und Öl oder Joghurtsoße.", img: "illu/salat.svg", imgAlt: "Illustration: Salat", seo: { title: "Salate in Biberach", desc: "Frische Salate von SHAHI Küche in Biberach: vom grünen Salat bis zum Salat mit gegrilltem Lachs – zum Abholen und mit Lieferservice." } },
    { id: "burger", slug: "burger", name: "Burger", desc: "Alle mit grünem Salat, Tomaten, Gurken und Zwiebeln.", img: "illu/burger.svg", imgAlt: "Illustration: Burger", seo: { title: "Burger in Biberach", desc: "Burger von SHAHI Küche in Biberach – vom Hamburgerle bis zum Schwaben Burger XXL. Abholung in der Bachgasse 17 und Lieferservice." } },
    { id: "potatoes", slug: "potatoes", name: "Potatoes", desc: "Jeweils klein oder groß.", img: "illu/pommes.svg", imgAlt: "Illustration: Pommes", seo: { title: "Pommes, Wedges & Co. in Biberach", desc: "Pommes, Wedges, Süßkartoffeln, Curly Fries, Kroketten, Bratkartoffeln und Rösti von SHAHI Küche in Biberach." } },
    { id: "fingerfood", slug: "fingerfood", name: "Fingerfood", img: "illu/fingerfood.svg", imgAlt: "Illustration: Fingerfood", seo: { title: "Fingerfood in Biberach", desc: "Onion Rings, Chicken Wings, Mozzarella Sticks und mehr – Fingerfood von SHAHI Küche in Biberach." } },
    { id: "partyplatten", slug: "partyplatten", name: "Partyplatten", desc: "Für 2 oder für 4 Personen.", img: "illu/platte.svg", imgAlt: "Illustration: Partyplatte", seo: { title: "Partyplatten in Biberach", desc: "Partyplatten für 2 oder 4 Personen und das Menü für 1 Person – SHAHI Küche in Biberach." } },
    { id: "dips", slug: "dips", name: "Dips & Soßen", img: "illu/dip.svg", imgAlt: "Illustration: Dips", seo: { title: "Dips & Soßen", desc: "Dips und Soßen von SHAHI Küche in Biberach – von Cocktail Dip bis Shahi Spezial Dip." } },
    { id: "doener", slug: "doener", name: "Döner", desc: "Hackfleischdrehspieß im Fladenbrot, im Rollteig oder als Teller.", img: "illu/doener.svg", imgAlt: "Illustration: Döner", seo: { title: "Döner in Biberach", desc: "Döner, Dürüm und Dönerteller von SHAHI Küche in Biberach – zum Abholen in der Bachgasse 17 oder mit Lieferservice." } },
    { id: "ueberbacken", slug: "ueberbacken", name: "Überbacken", img: "illu/auflauf.svg", imgAlt: "Illustration: überbackenes Gericht", seo: { title: "Überbackene Teller in Biberach", desc: "Überbackene Döner-, BBQ- und Lachsteller von SHAHI Küche in Biberach." } },
    { id: "pizza", slug: "pizza", name: "Pizza", desc: "30 cm. Alle Pizzas mit Tomatensoße und Käse.", img: "illu/pizza.svg", imgAlt: "Illustration: Pizza", seo: { title: "Pizza in Biberach", desc: "Pizza (30 cm) von SHAHI Küche in Biberach – von Margherita bis Shahi Spezial. Abholung und Lieferservice." } },
    { id: "partypizza", slug: "party-pizza", name: "Party-Pizza", desc: "40 × 60 cm.", img: "illu/partypizza.svg", imgAlt: "Illustration: Party-Pizza", seo: { title: "Party-Pizza in Biberach", desc: "Party-Pizza 40 × 60 cm von SHAHI Küche in Biberach – Margherita oder mit vier Belägen nach Wahl." } },
    { id: "nudeln", slug: "nudeln", name: "Nudeln", desc: "Spaghetti oder Penne. Alle Gerichte gibt es auch überbacken (+2,50 €).", img: "illu/pasta.svg", imgAlt: "Illustration: Nudelgericht", seo: { title: "Nudeln in Biberach", desc: "Spaghetti und Penne von SHAHI Küche in Biberach – von Aglio bis Frutti di Mare, auf Wunsch überbacken." } },
    { id: "indisch", slug: "indisch-pakistanisch", name: "Indisch & Pakistanisch", desc: "Alle Gerichte mit Reis.", img: "illu/curry.svg", imgAlt: "Illustration: Curry mit Reis", seo: { title: "Indisches & pakistanisches Essen in Biberach", desc: "Butter Chicken, Chicken Tikka Masala, Chicken Korma und weitere indische und pakistanische Gerichte von SHAHI Küche in Biberach." } },
    { id: "vegetarisch", slug: "vegetarische-gerichte", name: "Vegetarische Gerichte", img: "illu/curryveg.svg", imgAlt: "Illustration: vegetarisches Curry", seo: { title: "Vegetarische Currys in Biberach", desc: "Alu Palak, Alu Chana, Mixed Vegetables und Alu Mattar – vegetarische Gerichte von SHAHI Küche in Biberach." } },
    { id: "schnitzel", slug: "schnitzel-steak", name: "Schnitzel & Steak", desc: "Alle Schnitzel vom Putenfleisch mit Pommes.", img: "illu/schnitzel.svg", imgAlt: "Illustration: Schnitzel mit Pommes", seo: { title: "Schnitzel in Biberach", desc: "Putenschnitzel Wiener Art, Allgäuer Art, Hawaii, Diabolo und Los Angeles – mit Pommes von SHAHI Küche in Biberach." } },
    { id: "dessert", slug: "desserts", name: "Desserts", img: "illu/donut.svg", imgAlt: "Illustration: Donut", seo: { title: "Desserts", desc: "Brownie, Donut, Tiramisu und Apfelküchle von SHAHI Küche in Biberach." } },
    { id: "getraenke", slug: "getraenke", name: "Getränke", img: "illu/getraenk.svg", imgAlt: "Illustration: Getränk", tax: "getraenke", seo: { title: "Getränke", desc: "Ayran, Mineralwasser, Softdrinks, Eistee, Apfelsaft und Red Bull bei SHAHI Küche in Biberach." } }
  ],

  /* --- Gerichte --- */
  items: [
    /* SALATE */
    { id: "salat-gruen", nr: "01", cat: "salate", name: "Grüner Salat", prices: [4.9], opts: ["salat-dressing"] },
    { id: "salat-gurke", nr: "02", cat: "salate", name: "Gurkensalat", prices: [5.9], opts: ["salat-dressing"] },
    { id: "salat-tomate", nr: "03", cat: "salate", name: "Tomatensalat", desc: "frische Tomaten und Zwiebeln", prices: [5.9], opts: ["salat-dressing"] },
    { id: "salat-gemischt", nr: "04", cat: "salate", name: "Gemischter Salat", desc: "grüner Salat, Kraut, Tomaten, Gurken und Karotten", prices: [8.5], opts: ["salat-dressing"] },
    { id: "salat-thunfisch", nr: "05", cat: "salate", name: "Thunfischsalat", desc: "grüner Salat, Tomaten, Gurken, Thunfisch und Zwiebeln", prices: [9.5], codes: "D,F", opts: ["salat-dressing"] },
    { id: "salat-casa-nova", nr: "06", cat: "salate", name: "Casa Nova", desc: "grüner Salat, Tomaten, Gurken, Mozzarella, Oliven, Paprika", prices: [10.5], codes: "9", opts: ["salat-dressing"], checks: [{ field: "allergene", note: "Enthält laut Beschreibung Mozzarella, ist aber nicht mit G (Milch) gekennzeichnet." }] },
    { id: "salat-griechisch", nr: "07", cat: "salate", name: "Griechischer Salat", flyerName: "Griechischer", desc: "grüner Salat, Tomaten, Gurken, Peperoni, Paprika, Oliven, Zwiebeln und Weichkäse", prices: [10.9], codes: "G,9", opts: ["salat-dressing"] },
    { id: "salat-nizza", nr: "08", cat: "salate", name: "Nizza Salat", desc: "grüner Salat, Tomaten, Gurken, Oliven, Thunfisch", prices: [10.5], codes: "D,G,9", opts: ["salat-dressing"] },
    { id: "salat-schwaebisch", nr: "09", cat: "salate", name: "Schwäbischer Teller", flyerName: "Schwäbische Teller", desc: "Salat, Tomaten, Gurken, Kraut, Karotten, Ei, Schinken, Käse", prices: [10.9], codes: "F,J,6,7,8,2", opts: ["salat-dressing"], checks: [{ field: "allergene", note: "Enthält laut Beschreibung Ei und Käse, ist aber nicht mit C (Ei) und G (Milch) gekennzeichnet." }] },
    { id: "salat-chicken", nr: "10", cat: "salate", name: "Chicken Salat", desc: "grüner Salat, Tomaten, Gurken, Karotten, Paprika, Mais und gegrillte Hähnchenbrust", prices: [11.9], opts: ["salat-dressing"], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung." }] },
    { id: "salat-shahi-spezial", nr: "11", cat: "salate", name: "Shahi Spezial Salat", desc: "grüner Salat, Tomaten, Gurken, Karotten, Paprika, Mais, Hähnchenbrust mit Cornflakes-Panade", prices: [12.9], codes: "A,C,G", opts: ["salat-dressing"] },
    { id: "salat-lahori", nr: "12", cat: "salate", name: "Lahori Salat", desc: "Tomaten, Gurken, Paprika, Karotten, Mais, grüner Salat, 5 Stück Chicken Wings", prices: [12.9], codes: "A,7", opts: ["salat-dressing"], checks: [{ field: "allergene", note: "Chicken Wings (Nr. 64) sind mit A, C, G gekennzeichnet, der Lahori Salat nur mit A, 7." }] },
    { id: "salat-salmone", nr: "14", cat: "salate", name: "Salmone", flyerName: "Salamone", desc: "grüner Salat, Tomaten, Gurken, Paprika, Mais, Karotten, gegrillter Lachs (200 g)", prices: [18.9], codes: "D", opts: ["salat-dressing"] },

    /* BURGER */
    { id: "burger-hamburgerle", nr: "20", cat: "burger", name: "Hamburgerle", desc: "100 g Rindfleisch-Patty und Smoky Cocktailsoße", prices: [5.5], codes: "A,C,G,F,J,6,7,8", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-cheeseburgerle", nr: "21", cat: "burger", name: "Cheeseburgerle", desc: "100 g Rindfleisch-Patty, Cheddarkäse und Smoky Cocktailsoße", prices: [6], codes: "A,C,G,F,J,6,7,8,2", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-fischburgerle", nr: "22", cat: "burger", name: "Fischburgerle", desc: "panierte Fischstäbchen, Remoulade, Cocktailsoße", prices: [6], codes: "A,C,D,G,F", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-chickenburgerle", nr: "23", cat: "burger", name: "Chickenburgerle", desc: "Hähnchenbrust mit Cornflakes-Panade und Smoky Cocktailsoße", prices: [6], codes: "A,C,G,F,J,6,7,8", opts: ["burger-beilage", "burger-extras"], checks: [{ field: "preis", note: "Preis im Foto teilweise durch Lichtreflex verdeckt („6,0…“). 6,00 € angenommen – bitte bestätigen.", blocks: true }] },
    { id: "burger-hamburger-xxl", nr: "24", cat: "burger", name: "Hamburger XXL", desc: "200 g Rindfleisch-Patty und Smoky Cocktailsoße", prices: [10.5], codes: "A,C,G,F,J,6,7,8", opts: ["burger-beilage", "burger-extras"], checks: [{ field: "kennzeichnung", note: "Im Flyer steht ein Sternchen (*) hinter dem Namen, ohne Erläuterung." }] },
    { id: "burger-cheeseburger-xxl", nr: "25", cat: "burger", name: "Cheeseburger XXL", desc: "200 g Rindfleisch-Patty, Cheddarkäse und Smoky Cocktailsoße", prices: [10.9], codes: "A,C,G,F,J,6,7,8,2", opts: ["burger-beilage", "burger-extras"], checks: [{ field: "kennzeichnung", note: "Im Flyer steht ein Sternchen (*) hinter dem Namen, ohne Erläuterung." }] },
    { id: "burger-chickenburger-xxl", nr: "26", cat: "burger", name: "Chickenburger XXL", desc: "Hähnchenbrust mit Cornflakes-Panade, Smoky Cocktailsoße", prices: [10.9], codes: "A,C,G,F,J,6,7,8", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-hot-chili", nr: "27", cat: "burger", name: "Hot Chili Cheeseburger XXL", desc: "200 g Rindfleisch-Patty, Cheddarkäse, Jalapeños und scharfe Smoky Cocktailsoße", prices: [10.9], codes: "A,C,G,F,J,6,7,8,2", opts: ["burger-beilage", "burger-extras"], tags: ["scharf"] },
    { id: "burger-shahi-spezial-xxl", nr: "28", cat: "burger", name: "Shahi Spezial Burger XXL", desc: "200 g Rindfleisch-Patty, Cheddarkäse, Rösti und Smoky Cocktailsoße", prices: [11.5], codes: "A,C,G,F,J,6,7,8,2", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-scharf-lady", nr: "29", cat: "burger", name: "Scharf Lady", desc: "Hähnchenbrust mit Cornflakes-Panade, Cheddarkäse, Jalapeños, Spiegelei, Hot-Cocktailsoße", prices: [10.5], codes: "A,C,G,F,J,6,7,8,2", opts: ["burger-beilage", "burger-extras"], tags: ["scharf"] },
    { id: "burger-shahi-bbq", nr: "30", cat: "burger", name: "Shahi BBQ Burger", desc: "Patty, Cheddarkäse, Spiegelei, Röstzwiebeln, BBQ-Soße", prices: [11.9], codes: "A,C,G", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-schwaben-xxl", nr: "34", cat: "burger", name: "Schwaben Burger XXL", desc: "200 g Rindfleisch-Patty, Käsespätzle, grüner Salat, Tomaten, Gurken, Röstzwiebeln und Smoky Cocktailsoße", prices: [18.9], codes: "A,C,G,F,J,6,7,8", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-fisch", nr: "35", cat: "burger", name: "Fisch Burger", desc: "paniertes Fischfilet, Cheddarkäse und Smoky Cocktailsoße, Remoulade", prices: [10.5], codes: "A,C,D,G,2,6,7,8", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-shahi", nr: "36", cat: "burger", name: "Shahi Burger", desc: "mit Rind- und Chicken-Patty, grünem Salat, Tomaten, Gurken, Röstzwiebeln und Smoky Cocktailsoße", prices: [10.9], codes: "A,C,G,F,J,2,6,7,8", opts: ["burger-beilage", "burger-extras"] },
    { id: "burger-vegetarisch", nr: "37", cat: "burger", name: "Vegetarischer Burger", flyerName: "Vegetarische Burger", desc: "vegetarisches Schnitzel, Cheddarkäse, Smoky Cocktailsoße", prices: [9.5], codes: "A,C,G", opts: ["burger-beilage", "burger-extras"], tags: ["vegetarisch"] },
    { id: "burger-chicken-garnelen", nr: "38", cat: "burger", name: "Chicken und Garnelen Burger", desc: "mit Tomaten, Gurken, Röstzwiebeln und Cocktailsoße", prices: [12.9], codes: "A,C,G,F,J,2,6,7,8", opts: ["burger-beilage", "burger-extras"], checks: [{ field: "allergene", note: "Garnelen sind Krebstiere – keine Kennzeichnung B im Flyer." }] },
    { id: "burger-cheese-garnelen", nr: "39", cat: "burger", name: "Cheese-Garnelen Burger", flyerName: "Chesse - Garnelen Burger", desc: "mit Tomaten, Gurken, Röstzwiebeln und Cocktailsoße", prices: [12.9], opts: ["burger-beilage", "burger-extras"], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (enthält u. a. Garnelen/Krebstiere, Käse, Brötchen)." }] },

    /* POTATOES */
    { id: "potatoes-pommes", nr: "40", cat: "potatoes", name: "Pommes", prices: [["klein", 4.9], ["groß", 6.9]] },
    { id: "potatoes-wedges", nr: "41", cat: "potatoes", name: "Wedges", prices: [["klein", 4.9], ["groß", 6.9]] },
    { id: "potatoes-suesskartoffeln", nr: "42", cat: "potatoes", name: "Süßkartoffeln", prices: [["klein", 5.5], ["groß", 7.9]] },
    { id: "potatoes-curly-fries", nr: "43", cat: "potatoes", name: "Curly Fries", prices: [["klein", 5.5], ["groß", 7.9]] },
    { id: "potatoes-kroketten", nr: "44", cat: "potatoes", name: "Kroketten", prices: [["klein", 5.5], ["groß", 7.9]], codes: "A,G" },
    { id: "potatoes-bratkartoffeln", nr: "45", cat: "potatoes", name: "Bratkartoffeln", prices: [["klein", 5.5], ["groß", 7.9]] },
    { id: "potatoes-roesti", nr: "46", cat: "potatoes", name: "Rösti", flyerName: "Rosti", prices: [["klein", 5.5], ["groß", 7.9]], codes: "A,C,G" },

    /* FINGERFOOD */
    { id: "finger-onion-rings", nr: "50", cat: "fingerfood", name: "Onion Rings", desc: "10 Stück", prices: [7.9], codes: "A,C" },
    { id: "finger-fruehlingsrollen", nr: "51", cat: "fingerfood", name: "Frühlingsrollen", desc: "10 Stück", prices: [6], codes: "A,6" },
    { id: "finger-mozzarella-sticks", nr: "52", cat: "fingerfood", name: "Mozzarella Sticks", desc: "10 Stück", prices: [7.9], codes: "A,C,G" },
    { id: "finger-fischstaebchen", nr: "53", cat: "fingerfood", name: "Fischstäbchen", desc: "10 Stück", prices: [7.9], codes: "A,C,D,G,F" },
    { id: "finger-chicken-nuggets", nr: "54", cat: "fingerfood", name: "Chicken Nuggets", desc: "10 Stück", prices: [7.9], codes: "A,7" },
    { id: "finger-chili-cheese-nuggets", nr: "56", cat: "fingerfood", name: "Chili Cheese Nuggets", desc: "10 Stück", prices: [8.9], codes: "A,C", checks: [{ field: "allergene", note: "Enthält laut Name Käse, ist aber nicht mit G (Milch) gekennzeichnet." }] },
    { id: "finger-chicken-finger", nr: "57", cat: "fingerfood", name: "Chicken Finger", desc: "6 Stück", prices: [8.9], codes: "A,C" },
    { id: "finger-camembert", nr: "59", cat: "fingerfood", name: "Camembert", desc: "2 Stück mit Pommes", prices: [8.9], codes: "A,C,G" },
    { id: "finger-schnitzel-crunchy", nr: "60", cat: "fingerfood", name: "Schnitzel Crunchy", desc: "Pute mit Pommes", prices: [8.9], codes: "A,C,G" },
    { id: "finger-fisch-paniert", nr: "61", cat: "fingerfood", name: "Fisch paniert", flyerName: "Fisch Paniert", desc: "mit Pommes", prices: [8.9], codes: "A,C,G,D" },
    { id: "finger-veggie-schnitzel", nr: "62", cat: "fingerfood", name: "Veggie Schnitzel", desc: "mit Pommes", prices: [8.9], codes: "A,C,G", tags: ["vegetarisch"] },
    { id: "finger-calamari", nr: "63", cat: "fingerfood", name: "Calamari Fritti", desc: "10 Stück", prices: [8.9], codes: "A,C,G,D", checks: [{ field: "allergene", note: "Calamari sind Weichtiere – gekennzeichnet ist D (Fisch), nicht N (Weichtiere)." }] },
    { id: "finger-chicken-wings", nr: "64", cat: "fingerfood", name: "Chicken Wings", desc: "8 Stück", prices: [9.9], codes: "A,C,G" },
    { id: "finger-kartoffeltasche", nr: "65", cat: "fingerfood", name: "Kartoffeltasche", flyerName: "Kartoffel Tasche", desc: "5 Stück", prices: [8.5], codes: "A,C,G" },
    { id: "finger-filo-shrimps", nr: "66", cat: "fingerfood", name: "Filo Pastry Shrimps", desc: "10 Stück", prices: [9.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (Shrimps = Krebstiere, Teig = Gluten)." }] },

    /* PARTYPLATTEN */
    { id: "platte-fingerfood", nr: "70", cat: "partyplatten", name: "Fingerfood Platte", desc: "Putenschnitzel paniert, Onion Rings, Mozzarella Sticks, Chicken Wings, Pommes oder Wedges, Frühlingsrollen, Rösti, Kroketten, verschiedene Dips", prices: [["für 2 Personen", 34.9], ["für 4 Personen", 48.9]], codes: "A,C,G", opts: ["platte-beilage"], checks: [{ field: "beschreibung", note: "Beschreibung im Foto teilweise durch Lichtreflex verdeckt („Putenschnitz…“, „Chicken Wi…“, „Kro…“) und sinngemäß ergänzt." }] },
    { id: "platte-burger", nr: "71", cat: "partyplatten", name: "Burger Platte", desc: "Hamburger oder Chicken Burger, Mozzarella Sticks, Chicken Wings, Pommes oder Wedges, Frühlingsrollen, Rösti, Kroketten und verschiedene Dips", prices: [["für 2 Personen", 34.9], ["für 4 Personen", 48.9]], codes: "A,C,G,F,J,6,7,8", opts: ["platte-burger", "platte-beilage"], checks: [{ field: "beschreibung", note: "Name und Beschreibung im Foto teilweise durch Lichtreflex verdeckt („Burger …e“, „Hamburge… …er Chicken Burger“) und sinngemäß ergänzt." }] },
    { id: "platte-shahi-spezial", nr: "72", cat: "partyplatten", name: "Shahi Spezial Platte", desc: "Hackfleischdrehspieß, Beilage Salat, Mozzarella Sticks, Chicken Wings, Pommes oder Wedges, Frühlingsrollen, Rösti, Kroketten, verschiedene Dips", prices: [["für 2 Personen", 34.9], ["für 4 Personen", 48.9]], codes: "A,C,G,F,J,6,7,8", opts: ["platte-beilage"] },
    { id: "menue-1-person", nr: "73", cat: "partyplatten", name: "Menü für 1 Person", desc: "Burger 20 oder 21 oder 23, Chicken Wings, Onion Rings, Frühlingsrollen, Mozzarella Sticks, Chicken Nuggets, Pommes, Getränk", prices: [18.5], opts: ["menue-burger"], tax: { split: true, drinkShare: null }, checks: [{ field: "varianten", note: "Welches Getränk (Sorte, Größe) ist im Menü enthalten bzw. wählbar? Fällt dafür Pfand an?", blocks: true }, { field: "allergene", note: "Im Flyer ohne Gesamtkennzeichnung. Enthaltene Einzelprodukte: Nr. 20/21/23, 50, 51, 52, 54, 64, Pommes, Getränk." }, { field: "steuer", note: "Kombiangebot aus Speisen (7 %) und Getränk (19 %): Aufteilungsmethode und Getränkeanteil mit der Steuerberatung festlegen." }] },

    /* DIPS & SOSSEN */
    { id: "dip-cocktail", nr: "80", cat: "dips", name: "Cocktail Dip", flyerName: "Coctail Dip", prices: [1.2], codes: "A,C,G" },
    { id: "dip-hot-cocktail", nr: "81", cat: "dips", name: "Hot Cocktail Dip", flyerName: "Hot Coctail Dip", prices: [1.2], codes: "A,C,G" },
    { id: "dip-sour-cream", nr: "82", cat: "dips", name: "Sour Cream", prices: [1.2], codes: "A,G" },
    { id: "dip-shahi-spezial", nr: "83", cat: "dips", name: "Shahi Spezial Dip", prices: [1.2], codes: "A,C,G" },
    { id: "dip-bbq", nr: "84", cat: "dips", name: "BBQ-Soße", flyerName: "BBQ Soße", prices: [1.2], codes: "A,C,G" },
    { id: "dip-sweet-chili", nr: "85", cat: "dips", name: "Sweet-Chili-Soße", flyerName: "Sweet Chili Soße", prices: [1.2], codes: "A,C,G" },
    { id: "dip-doenersosse", nr: "87", cat: "dips", name: "Dönersoße", prices: [1.2], codes: "A,C,G" },
    { id: "dip-ketchup-mayo-remoulade", nr: "88", cat: "dips", name: "Ketchup / Mayo / Remoulade", flyerName: "Ketchup/Majo/Remoulade", prices: [0.5], codes: "A,C,G", opts: ["dip-sorte"] },

    /* DÖNER */
    { id: "doener-fladenbrot", nr: "90", cat: "doener", name: "Hackfleischdrehspieß", desc: "mit Salat und Soße im Fladenbrot", prices: [7], codes: "A,C,G,F,J,6,7,8" },
    { id: "doener-shahi", nr: "91", cat: "doener", name: "Hackfleischdrehspieß Shahi", desc: "mit Salat, Spiegelei und Soße im Fladenbrot", prices: [7.9], codes: "A,C,G,F,J,6,7,8" },
    { id: "doener-vegetarisch", nr: "92", cat: "doener", name: "Vegetarisch", desc: "mit Weichkäse, Salat und Soße im Fladenbrot", prices: [6], codes: "A,C,G,6,7,8", tags: ["vegetarisch"] },
    { id: "doener-duerum", nr: "93", cat: "doener", name: "Dürüm", desc: "mit Hackfleischdrehspieß, Salat und Soße im Rollteig", prices: [8.5], codes: "A,C,G,F,J,6,7,8" },
    { id: "doener-duerum-vegetarisch", nr: "94", cat: "doener", name: "Dürüm vegetarisch", desc: "mit Weichkäse, Salat und Soße im Rollteig", prices: [7], codes: "A,C,G,6,7,8", tags: ["vegetarisch"] },
    { id: "doener-falafel-teller", nr: "95", cat: "doener", name: "Falafel Teller", desc: "mit Falafel, Salat, Soße und Pommes", prices: [10.9], codes: "A,C,G,6,7,8" },
    { id: "doener-teller", nr: "96", cat: "doener", name: "Dönerteller", desc: "mit Hackfleischdrehspieß, Salat und Soße", prices: [9.9], codes: "A,C,G,F,J,6,7,8" },
    { id: "doener-teller-beilage", nr: "96a", cat: "doener", name: "Dönerteller", desc: "mit Hackfleischdrehspieß, Salat, Soße und wahlweise Pommes, Wedges oder Reis", prices: [11.9], codes: "A,C,G,F,J,6,7,8", opts: ["beilage-pwr"] },

    /* ÜBERBACKEN */
    { id: "ueberbacken-doenerteller", nr: "97", cat: "ueberbacken", name: "Dönerteller überbacken", desc: "mit Hackfleischdrehspieß, Tomaten, Tomatensoße, Pommes", prices: [12.5], codes: "A,C,G,F,J,6,7,8" },
    { id: "ueberbacken-doenerteller-minar", nr: "98", cat: "ueberbacken", name: "Dönerteller Minar überbacken", desc: "Hackfleischdrehspieß, Pommes, Hot Cocktail, Edamer, Cheddarkäse, Dip", prices: [12.5], codes: "A,C,G,6,7,8", checks: [{ field: "name", note: "Der SHAHI-Flyer nennt das Gericht „Dönerteller Minar überbacken“ – Name so beibehalten oder anpassen? Welcher Dip ist enthalten?" }] },
    { id: "ueberbacken-bbq-teller", nr: "98a", cat: "ueberbacken", name: "BBQ Teller überbacken", flyerName: "B.B.Q Teller überbacken", desc: "Hackfleischdrehspieß, Pommes, hausgemachte BBQ-Soße, Emmentaler, Cheddarkäse, Dip", prices: [12.5], codes: "A,C,G,6,7,8" },
    { id: "ueberbacken-lachs-teller", nr: "98b", cat: "ueberbacken", name: "Lachs Teller überbacken", desc: "gegrillter Lachs, Pommes, Remoulade, Cocktail, Edamer, Dip", prices: [18.9], codes: "A,C,D,G,6,7,8" },
    { id: "ueberbacken-istanbul", nr: "99", cat: "ueberbacken", name: "Istanbul überbacken", desc: "Hackfleischdrehspieß, Tomatensahnesoße, Penne", prices: [12.5], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (enthält u. a. Penne, Sahnesoße, Drehspieß)." }] },
    { id: "ueberbacken-schwaebisch", nr: "99a", cat: "ueberbacken", name: "Schwäbische überbacken", desc: "Kartoffelscheiben, Sahnesoße, Edamer", prices: [11.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (enthält u. a. Sahnesoße und Edamer)." }] },

    /* PIZZA */
    { id: "pizza-pizzabrot", nr: "100", cat: "pizza", name: "Pizzabrot", prices: [5], codes: "A" },
    { id: "pizza-margherita", nr: "101", cat: "pizza", name: "Margherita", prices: [7.9], codes: "A,G" },
    { id: "pizza-zwiebel", nr: "102", cat: "pizza", name: "Zwiebel", prices: [8.9], codes: "A,G" },
    { id: "pizza-mais", nr: "103", cat: "pizza", name: "Mais", prices: [8.9], codes: "A,G" },
    { id: "pizza-brokkoli", nr: "104", cat: "pizza", name: "Brokkoli", prices: [8.9], codes: "A,G" },
    { id: "pizza-funghi", nr: "105", cat: "pizza", name: "Funghi", desc: "mit Champignons", prices: [8.9], codes: "A,G" },
    { id: "pizza-salami", nr: "106", cat: "pizza", name: "Salami", prices: [9.4], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-schinken", nr: "107", cat: "pizza", name: "Schinken", prices: [9.4], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-sucuk-ei", nr: "108", cat: "pizza", name: "Sucuk mit Ei", desc: "türkische Knoblauchwurst", prices: [9.9], codes: "A,C,G,F,J,6,7,8" },
    { id: "pizza-spinat", nr: "109", cat: "pizza", name: "Spinat", desc: "mit Weichkäse", prices: [9.9], codes: "A,G" },
    { id: "pizza-thunfisch", nr: "110", cat: "pizza", name: "Thunfisch", desc: "mit Zwiebeln", prices: [9.9], codes: "A,D,F,G" },
    { id: "pizza-hawaii", nr: "111", cat: "pizza", name: "Hawaii", desc: "mit Schinken und Ananas", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-salami-peperoni", nr: "112", cat: "pizza", name: "Salami-Peperoni", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-diavolo", nr: "113", cat: "pizza", name: "Diavolo", desc: "Salami, Jalapeños", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-salami-schinken", nr: "114", cat: "pizza", name: "Salami-Schinken", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-roma", nr: "115", cat: "pizza", name: "Roma", desc: "mit Schinken und Champignons", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-hackfleisch", nr: "116", cat: "pizza", name: "Hackfleisch", desc: "mit Zwiebeln", prices: [9.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (alle Pizzas mit Teig und Käse)." }] },
    { id: "pizza-vegetarisch", nr: "117", cat: "pizza", name: "Vegetarisch", desc: "mit Champignons, Paprika, Oliven und Zwiebeln", prices: [9.4], codes: "A,G,9", tags: ["vegetarisch"] },
    { id: "pizza-pindi-express", nr: "118", cat: "pizza", name: "Pindi Express", desc: "mit Chicken, Ananas, Curry", prices: [9.4], codes: "A,G,F" },
    { id: "pizza-salmone", nr: "119", cat: "pizza", name: "Salmone", desc: "gegrilltes Lachsfilet und Knoblauch", prices: [10.9], codes: "A,G,D" },
    { id: "pizza-gamberetti", nr: "120", cat: "pizza", name: "Gamberetti", flyerName: "Gambaretti", desc: "mit Krabben und Knoblauch", prices: [10.9], codes: "A,G,D", checks: [{ field: "allergene", note: "Krabben sind Krebstiere – gekennzeichnet ist D (Fisch), nicht B (Krebstiere)." }] },
    { id: "pizza-frutti-di-mare", nr: "121", cat: "pizza", name: "Frutti di Mare", desc: "Meeresfrüchte, Knoblauch", prices: [10.9], codes: "A,G,D", checks: [{ field: "allergene", note: "Meeresfrüchte enthalten meist Krebs- und/oder Weichtiere – gekennzeichnet ist nur D (Fisch)." }] },
    { id: "pizza-speziale", nr: "122", cat: "pizza", name: "Speziale", desc: "mit Salami, Schinken, Champignons, Peperoni", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-venezia", nr: "123", cat: "pizza", name: "Venezia", desc: "mit Salami, Schinken, Champignons und Oliven", prices: [9.9], codes: "A,G,F,J,6,7,8,9" },
    { id: "pizza-vera", nr: "124", cat: "pizza", name: "Vera", desc: "mit Salami, Schinken, Champignons und Ei", prices: [9.9], codes: "A,G,F,J,6,7,8", checks: [{ field: "allergene", note: "Enthält laut Beschreibung Ei, ist aber nicht mit C (Ei) gekennzeichnet." }] },
    { id: "pizza-quattro-formaggi", nr: "125", cat: "pizza", name: "Quattro Formaggi", desc: "mit vier verschiedenen Käsesorten", prices: [9.9], codes: "A,G,2" },
    { id: "pizza-shahi-spezial", nr: "126", cat: "pizza", name: "Shahi Spezial", desc: "mit Hackfleischdrehspieß, Sucuk, Peperoni und Zwiebeln", prices: [10.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-calzone-spezial", nr: "128", cat: "pizza", name: "Calzone Spezial", desc: "mit Salami, Schinken, Peperoni und Champignons", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-calzone-kebap", nr: "129", cat: "pizza", name: "Calzone Kebap", desc: "mit Hackfleischdrehspieß und Zwiebeln", prices: [9.9], codes: "A,G,F,J,6,7,8" },
    { id: "pizza-calzone-vegi", nr: "129a", cat: "pizza", name: "Calzone vegi", desc: "mit Oliven, Paprika, Zwiebeln, Pilzen", prices: [9.9], tags: ["vegetarisch"], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (Teig, Käse, Oliven)." }] },
    { id: "pizza-sardellen", nr: "131", cat: "pizza", name: "Sardellen", desc: "mit Oliven und Kapern", prices: [10.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (Sardellen = Fisch, Teig, Käse, Oliven)." }] },
    { id: "pizza-artischocke", nr: "132", cat: "pizza", name: "Artischocke", prices: [9.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (alle Pizzas mit Teig und Käse)." }] },
    { id: "pizza-paprika", nr: "133", cat: "pizza", name: "Paprika", prices: [9.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (alle Pizzas mit Teig und Käse)." }] },
    { id: "pizza-caprese", nr: "134", cat: "pizza", name: "Caprese", desc: "mit Mozzarella und Tomaten", prices: [10.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (Teig, Käse, Mozzarella)." }] },
    { id: "pizza-oliven", nr: "134a", cat: "pizza", name: "Oliven", prices: [8.9], checks: [{ field: "allergene", note: "Im Flyer ohne Kennzeichnung (Teig, Käse; Oliven sonst mit „9“ gekennzeichnet)." }] },

    /* PARTY-PIZZA */
    { id: "partypizza-margherita", nr: "135", cat: "partypizza", name: "Party-Pizza Margherita", flyerName: "Party Pizza Margherita", prices: [28], codes: "A,G" },
    { id: "partypizza-4-belaege", nr: "136", cat: "partypizza", name: "Party-Pizza", flyerName: "Party Pizza", desc: "mit vier Belägen nach Wahl", prices: [34], codes: "A,C,G,F,J,6,7,8", opts: ["partypizza-belaege"] },

    /* NUDELN */
    { id: "nudeln-aglio", nr: "139", cat: "nudeln", name: "Aglio Spaghetti", desc: "mit Knoblauch, Oliven, Peperoni", prices: [8.9], codes: "A,C,F,6,9", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-napoli", nr: "140", cat: "nudeln", name: "Napoli", desc: "mit Tomatensoße", prices: [9], codes: "A,C,F,6", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-arrabbiata", nr: "141", cat: "nudeln", name: "Arrabbiata", flyerName: "Arrabiata", desc: "Tomatensoße, Peperoni, scharf", prices: [9.9], codes: "A,C,F,6", opts: ["nudel-sorte", "nudel-ueberbacken"], tags: ["scharf"] },
    { id: "nudeln-bolognese", nr: "142", cat: "nudeln", name: "Bolognese", desc: "mit Tomaten-Hackfleischsoße", prices: [10.9], codes: "A,C,G,F,J,6,7,8", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-brokkoli", nr: "143", cat: "nudeln", name: "Brokkoli", desc: "Pilze und Sahnesoße", prices: [10.9], codes: "A,C,F,6", opts: ["nudel-sorte", "nudel-ueberbacken"], checks: [{ field: "allergene", note: "Sahnesoße, aber keine Kennzeichnung G (Milch)." }] },
    { id: "nudeln-carbonara", nr: "144", cat: "nudeln", name: "Carbonara", desc: "mit Schinken, Erbsen, Ei und Sahnesoße", prices: [10.9], codes: "A,C,G,F,J,6,7,8", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-vegetarisch", nr: "145", cat: "nudeln", name: "Vegetarisch", desc: "Pilze, Erbsen, Brokkoli, Tomatensahnesoße", prices: [10.9], codes: "A,C", opts: ["nudel-sorte", "nudel-ueberbacken"], tags: ["vegetarisch"], checks: [{ field: "allergene", note: "Tomatensahnesoße, aber keine Kennzeichnung G (Milch)." }] },
    { id: "nudeln-emiliani", nr: "146", cat: "nudeln", name: "Emiliani", desc: "mit Schinken, Champignons, Erbsen und Tomatensahnesoße", prices: [10.9], codes: "A,C,G,F,J,6,7,8", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-quattro-formaggi", nr: "147", cat: "nudeln", name: "Quattro Formaggi", flyerName: "Quattro Formaggie", desc: "vier Käsesorten, Sahnesoße", prices: [10.9], codes: "A,C,G", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-spinaci", nr: "148", cat: "nudeln", name: "Spinaci", desc: "mit Gorgonzola, Sahnesoße", prices: [10.9], codes: "A,C,G", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-con-pollo", nr: "149", cat: "nudeln", name: "Con Pollo", desc: "mit Hähnchenbrust, Champignons und Tomaten-Sahnesoße", prices: [10.9], codes: "A,C,G,6", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-salmone", nr: "151", cat: "nudeln", name: "Salmone", desc: "Lachsfilet, Champignons, Sahnesoße", prices: [13.9], codes: "A,C,D,G", opts: ["nudel-sorte", "nudel-ueberbacken"] },
    { id: "nudeln-gamberoni", nr: "152", cat: "nudeln", name: "Gamberoni", desc: "Krabben, Knoblauch und Tomatensahnesoße", prices: [12.9], codes: "A,C,D,G", opts: ["nudel-sorte", "nudel-ueberbacken"], checks: [{ field: "allergene", note: "Krabben sind Krebstiere – gekennzeichnet ist D (Fisch), nicht B (Krebstiere)." }] },
    { id: "nudeln-frutti-di-mare", nr: "153", cat: "nudeln", name: "Frutti di Mare", desc: "Meeresfrüchte, Knoblauch, Tomatensoße", prices: [12.9], codes: "A,C,D,G", opts: ["nudel-sorte", "nudel-ueberbacken"], checks: [{ field: "allergene", note: "Meeresfrüchte enthalten meist Krebs- und/oder Weichtiere – gekennzeichnet ist nur D (Fisch)." }] },

    /* INDISCH & PAKISTANISCH */
    { id: "indisch-naan", nr: "155", cat: "indisch", name: "Naan", prices: [3], codes: "A,C,G", checks: [{ field: "beschreibung", note: "Die Kategorie trägt den Hinweis „Alle Gerichte mit Reis“ – gilt das auch für Naan (vermutlich nicht)?" }] },
    { id: "indisch-garlic-naan", nr: "156", cat: "indisch", name: "Garlic Naan", desc: "Knoblauch, Koriander", prices: [3.5], codes: "A,C,G" },
    { id: "indisch-mix-chicken-vegetable", nr: "157", cat: "indisch", name: "Mix Chicken Vegetable Masala", desc: "Hähnchenbrust, verschiedenes Gemüse in Currysoße", prices: [12.9], codes: "F,G,2,6" },
    { id: "indisch-shahi-chicken-cheese", nr: "158", cat: "indisch", name: "Shahi Chicken Cheese Masala", desc: "Hähnchenbrust, Zwiebeln und Minar Gewürzmischung, Cheddar- und Edamerkäse in Cheesecurry-Joghurtsoße", prices: [14.9], codes: "F,G,2,6", checks: [{ field: "beschreibung", note: "Der SHAHI-Flyer nennt hier eine „Minar Gewürzmischung“ – so beibehalten oder anpassen?" }] },
    { id: "indisch-chicken-curry", nr: "160", cat: "indisch", name: "Chicken Curry", desc: "Hähnchenbrust in Currysoße", prices: [12.9], codes: "F,G,2,6" },
    { id: "indisch-chicken-korma", nr: "161", cat: "indisch", name: "Chicken Korma", desc: "Hähnchenbrust in Curry-Joghurtsoße", prices: [12.9], codes: "F,G,2,6" },
    { id: "indisch-chili-chicken", nr: "162", cat: "indisch", name: "Chili Chicken", desc: "Hähnchenbrust in pikanter Soße nach indischer Art", prices: [12.9], codes: "F,G,2,6" },
    { id: "indisch-chicken-palak", nr: "163", cat: "indisch", name: "Chicken Palak", desc: "Hähnchenbrust und Spinat in Currysoße", prices: [12.9], codes: "F,G,2,6" },
    { id: "indisch-chana-chicken", nr: "164", cat: "indisch", name: "Chana Chicken", desc: "Kichererbsen, Chicken-Brust, Currysoße", prices: [12.9], codes: "F,G,2,6" },
    { id: "indisch-butter-chicken", nr: "166", cat: "indisch", name: "Butter Chicken", desc: "mit Tomaten, Kurkuma, Garam Masala, Joghurt", prices: [12.9], codes: "F,G,2,6" },
    { id: "indisch-chicken-tikka-masala", nr: "167", cat: "indisch", name: "Chicken Tikka Masala", desc: "Hähnchenstücke in Joghurt, Tomatensoße, Zwiebeln und Ingwer", prices: [12.9], codes: "F,G,2,6" },

    /* VEGETARISCHE GERICHTE */
    { id: "veg-alu-palak", nr: "170", cat: "vegetarisch", name: "Alu Palak", desc: "Kartoffeln, Spinat in Currysoße", prices: [10.9], codes: "F,G,2,6", tags: ["vegetarisch"] },
    { id: "veg-alu-chana", nr: "171", cat: "vegetarisch", name: "Alu Chana", desc: "Kartoffeln, Kichererbsen in Curry-Joghurtsoße", prices: [10.9], codes: "F,G,2,6", tags: ["vegetarisch"] },
    { id: "veg-mixed-vegetables", nr: "172", cat: "vegetarisch", name: "Mixed Vegetables", desc: "verschiedenes Gemüse in Currysoße", prices: [10.9], codes: "F,G,2,6", tags: ["vegetarisch"] },
    { id: "veg-alu-mattar", nr: "173", cat: "vegetarisch", name: "Alu Mattar", desc: "Kartoffeln, Erbsen in Curry-Joghurtsoße", prices: [10.9], codes: "F,G,2,6", tags: ["vegetarisch"] },

    /* SCHNITZEL & STEAK */
    { id: "schnitzel-wiener-art", nr: "180", cat: "schnitzel", name: "Wiener Art", prices: [10.9], codes: "A,C" },
    { id: "schnitzel-allgaeuer-art", nr: "181", cat: "schnitzel", name: "Allgäuer Art", desc: "überbacken mit Schinken und Käse", prices: [14.5], codes: "A,C,G" },
    { id: "schnitzel-hawaii", nr: "182", cat: "schnitzel", name: "Hawaii", flyerName: "Hawai", desc: "überbacken mit Schinken, Ananas und Käse", prices: [14.5], codes: "A,C", checks: [{ field: "allergene", note: "Mit Käse überbacken, aber keine Kennzeichnung G (Milch)." }] },
    { id: "schnitzel-diabolo", nr: "183", cat: "schnitzel", name: "Diabolo", desc: "mit Chili, Salami, Jalapeños, Edamer und Cheddarkäse, überbacken", prices: [15.5], codes: "A,C", checks: [{ field: "allergene", note: "Mit Edamer und Cheddar, aber keine Kennzeichnung G (Milch)." }] },
    { id: "schnitzel-los-angeles", nr: "184", cat: "schnitzel", name: "Los Angeles", desc: "mit Jalapeños, Ananas, Edamer und Cheddarkäse, überbacken", prices: [15.5], codes: "A,C,G" },

    /* DESSERTS */
    { id: "dessert-brownie", nr: "190", cat: "dessert", name: "Brownie", prices: [3.9], codes: "C,G", checks: [{ field: "allergene", note: "Brownie ohne Kennzeichnung A (Gluten) – bitte prüfen." }] },
    { id: "dessert-donut", nr: "191", cat: "dessert", name: "Donut", prices: [2.9], codes: "A,C,G" },
    { id: "dessert-tiramisu", nr: "192", cat: "dessert", name: "Tiramisu", prices: [3.9], codes: "A,C,G" },
    { id: "dessert-apfelkuechle", nr: "193", cat: "dessert", name: "Apfelküchle", desc: "3 Stück", prices: [4.9], codes: "A,C,G,5" },

    /* GETRÄNKE */
    { id: "getraenk-ayran", cat: "getraenke", name: "Ayran", prices: [["0,25 l", 1.5, 250]], codes: "G", pfand: null, checks: [{ field: "pfand", note: "Pfand hängt von der Verpackung ab (Kunststoffflasche: 0,25 € Pfand; Becher mit Siegelfolie: kein Pfand). Bitte Verpackung angeben.", blocks: true }, { field: "steuer", note: "Ayran als Milcherzeugnis: bei Abholung/Lieferung ggf. 7 % statt 19 % – mit Steuerberatung klären." }] },
    { id: "getraenk-mineralwasser", cat: "getraenke", name: "Mineralwasser", prices: [["0,5 l", 2, 500]], pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen (Kunststoffflasche/Dose) – Verpackung bestätigen.", blocks: true }] },
    { id: "getraenk-multivitamin", cat: "getraenke", name: "Multivitamin", prices: [["0,5 l", 2.5, 500]], pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung bestätigen.", blocks: true }] },
    { id: "getraenk-coca-cola", cat: "getraenke", name: "Coca-Cola", prices: [["0,33 l", 2.25, 330], ["0,5 l", 2.5, 500], ["1,0 l", 3.5, 1000]], codes: "O,2", pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen.", blocks: true }] },
    { id: "getraenk-cola-light", cat: "getraenke", name: "Cola Light", prices: [["0,33 l", 2.25, 330], ["0,5 l", 2.5, 500], ["1,0 l", 3.5, 1000]], codes: "O,2", pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen.", blocks: true }] },
    { id: "getraenk-cola-zero", cat: "getraenke", name: "Cola Zero", prices: [["0,33 l", 2.25, 330], ["0,5 l", 2.5, 500], ["1,0 l", 3.5, 1000]], codes: "O,2", pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen.", blocks: true }] },
    { id: "getraenk-fanta", cat: "getraenke", name: "Fanta", prices: [["0,33 l", 2.25, 330], ["0,5 l", 2.5, 500], ["1,0 l", 3.5, 1000]], codes: "2,5,7", pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen.", blocks: true }] },
    { id: "getraenk-mezzo-mix", cat: "getraenke", name: "Mezzo Mix", prices: [["0,33 l", 2.25, 330], ["0,5 l", 2.5, 500], ["1,0 l", 3.5, 1000]], codes: "O,2,7", pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen.", blocks: true }] },
    { id: "getraenk-uludag", cat: "getraenke", name: "Uludağ", flyerName: "Uludag", prices: [["0,33 l", 2.25, 330], ["0,5 l", 2.5, 500], ["1,0 l", 3.5, 1000]], codes: "3,4", pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen.", blocks: true }] },
    { id: "getraenk-sprite", cat: "getraenke", name: "Sprite", prices: [["0,33 l", 2.25, 330], ["0,5 l", 2.5, 500], ["1,0 l", 3.5, 1000]], pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Verfügbarkeit aller Größen bestätigen.", blocks: true }] },
    { id: "getraenk-eistee", cat: "getraenke", name: "Eistee", prices: [["1,0 l", 4.5, 1000]], pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung und Sorte bestätigen.", blocks: true }] },
    { id: "getraenk-apfelsaft", cat: "getraenke", name: "Apfelsaft", prices: [["1,0 l", 4.5, 1000]], pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen – Verpackung bestätigen.", blocks: true }] },
    { id: "getraenk-red-bull", cat: "getraenke", name: "Red Bull", prices: [3], pfand: 0.25, checks: [{ field: "pfand", note: "Pfand nicht im Flyer. 0,25 € Einwegpfand angenommen (Dose) – bestätigen.", blocks: true }, { field: "varianten", note: "Füllmenge fehlt im Flyer (für den Grundpreis je Liter nötig)." }, { field: "allergene", note: "Ohne Kennzeichnung O (Koffein). Bei Energydrinks ist der Hinweis „Erhöhter Koffeingehalt …“ (LMIV) vorgeschrieben – bitte ergänzen." }] }
  ]
};
