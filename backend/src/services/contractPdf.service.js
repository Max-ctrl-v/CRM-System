const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/contracts');

function ensureDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtEur(v) {
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC';
}

function fmtEurInt(v) {
  return v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20AC';
}

// ── Layout helpers ──

const navy = '#0D1B3E';
const blue = '#1E56B5';
const cyan = '#4DAEE5';
const dark = '#0f172a';
const bodyColor = '#334155';
const gray = '#64748b';
const light = '#94a3b8';
const borderColor = '#d4dced';
const surface = '#f1f5fb';
const greenSurface = '#d1fae5';
const greenDark = '#065f46';
const greenAccent = '#059669';
const greenBorder = '#6ee7b7';
const blueSurface = '#dbeafe';
const blueBorder = '#93c5fd';
const boxBg = '#f0f4fa';
const boxBorder = '#c7d2e4';

function drawPageBands(doc) {
  doc.rect(0, 0, doc.page.width, 5).fill(navy);
  doc.rect(0, 5, doc.page.width, 1.5).fill(cyan);
}

function sectionHeading(doc, number, title, L, W) {
  doc.y += 12;
  const label = `\u00A7 ${number}  ${title}`;
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor(navy).text(label, L, doc.y);
  const y = doc.y + 3;
  doc.moveTo(L, y).lineTo(L + 38, y).strokeColor(cyan).lineWidth(1.5).stroke();
  doc.moveTo(L + 42, y).lineTo(L + W, y).strokeColor('#d4dced').lineWidth(0.4).stroke();
  doc.y = y + 5;
}

function subPoint(doc, secNum, pointNum, text, L, W) {
  const prefix = `${secNum}.${pointNum}`;
  const indent = 28;
  doc.fontSize(9).font('Helvetica-Bold').fillColor(dark)
    .text(prefix, L, doc.y + 3, { width: indent, lineGap: 2.5 });
  const savedY = doc.y - (doc.currentLineHeight() + 2.5);
  doc.fontSize(9).font('Helvetica').fillColor(bodyColor)
    .text(text, L + indent, savedY, { width: W - indent, lineGap: 2.5 });
  doc.y += 2;
}

function bulletPoint(doc, text, L, W) {
  const indent = 42;
  doc.fontSize(9).font('Helvetica').fillColor(bodyColor)
    .text(`\u2022  ${text}`, L + indent, doc.y + 1, { width: W - indent, lineGap: 2 });
}

function bulletList(doc, items, L, W) {
  items.forEach(t => bulletPoint(doc, t, L, W));
  doc.y += 2;
}

function drawPartyBox(doc, x, y, w, label, name, detail, c) {
  doc.roundedRect(x, y, w, 48, 4).fillColor(c.surface).fill();
  doc.roundedRect(x, y, w, 48, 4).strokeColor(c.border).lineWidth(0.5).stroke();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(c.gray).text(label, x + 10, y + 8, { width: w - 20 });
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(c.navy).text(name, x + 10, y + 19, { width: w - 20 });
  doc.fontSize(8).font('Helvetica').fillColor(c.gray).text(detail, x + 10, y + 33, { width: w - 20 });
}

// ── Main PDF generation ──

async function generateContractPdf(contract) {
  ensureDir();

  const seqNum = contract.contractNumber.split('-').pop();
  const fileName = `Vertrag ${seqNum}.pdf`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  const relativePath = `contracts/${fileName}`;

  const companyName = contract.company?.name || 'Unbekannt';
  const addr = `${contract.street} ${contract.streetNumber}, ${contract.zipCode} ${contract.city}`;
  const dur = contract.durationMonths >= 12
    ? `${Math.floor(contract.durationMonths / 12)} Jahr(e)${contract.durationMonths % 12 ? ` und ${contract.durationMonths % 12} Monat(e)` : ''}`
    : `${contract.durationMonths} Monat(e)`;
  const pctB = contract.paymentBewilligung || 50;
  const pctF = contract.paymentFinanzamt || 50;
  const rate = contract.commissionRate;
  const fq = contract.foerderquote || 25;
  const zf = contract.zahlungsfrist || 14;
  const variante = contract.verguetungsVariante || 'A';
  const rateB = contract.verguetungsSatzB || 12;
  const ts = contract.tagessatz || 1500;
  const ss = contract.stundensatz || 200;
  const haftSf = contract.haftungProSchadensfall || 50000;
  const haftKj = contract.haftungProKalenderjahr || 250000;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 58, right: 58 },
      bufferPages: true,
      info: { Title: `Dienstleistungsvertrag ${contract.contractNumber}`, Author: 'Novaris Consulting GmbH' },
    });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = doc.page.width - 116;
    const L = 58;
    const R = doc.page.width - 58;

    // Auto-draw top bands on new pages
    doc.on('pageAdded', () => {
      drawPageBands(doc);
      doc.y = 30;
    });

    // ════════════════════════════════════════════════════
    // PAGE 1 — Header + Vertragsparteien
    // ════════════════════════════════════════════════════
    drawPageBands(doc);

    let y = 32;
    doc.fontSize(20).font('Helvetica-Bold').fillColor(navy)
      .text('NOVARIS', L, y, { continued: true });
    doc.font('Helvetica').fillColor(blue).text(' CONSULTING');
    doc.fontSize(7.5).font('Helvetica').fillColor(gray)
      .text('Beratung f\u00FCr Forschungszulagen  \u00B7  Forschungszulagengesetz (FZulG)');

    y = doc.y + 6;
    doc.moveTo(L, y).lineTo(L + 45, y).strokeColor(cyan).lineWidth(2).stroke();
    doc.moveTo(L + 49, y).lineTo(R, y).strokeColor(borderColor).lineWidth(0.5).stroke();

    y += 14;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(navy)
      .text('Dienstleistungsvertrag', L, y, { width: W, align: 'center' });
    y = doc.y + 4;
    doc.fontSize(8.5).font('Helvetica').fillColor(gray)
      .text(`${contract.contractNumber}  \u00B7  ${formatDate(contract.createdAt)}`, L, y, { width: W, align: 'center' });

    // Vertragsparteien (unlabeled)
    y = doc.y + 14;
    const cW = (W - 20) / 2;
    drawPartyBox(doc, L, y, cW, 'AUFTRAGGEBER', companyName, addr, { navy: dark, gray, border: borderColor, surface });
    drawPartyBox(doc, L + cW + 20, y, cW, 'AUFTRAGNEHMER', 'Novaris Consulting GmbH', 'Beratung f\u00FCr Forschungszulagen', { navy: dark, gray, border: borderColor, surface });

    doc.y = y + 60;

    // ════════════════════════════════════════════════════
    // CONTRACT SECTIONS (automatic flow)
    // ════════════════════════════════════════════════════

    // § 1 Vertragsgegenstand
    sectionHeading(doc, 1, 'Vertragsgegenstand', L, W);
    subPoint(doc, 1, 1, 'Gegenstand dieses Vertrages ist die entgeltliche Beratung und Unterst\u00FCtzung des Auftraggebers im Zusammenhang mit der Beantragung und Geltendmachung der Forschungszulage nach dem Forschungszulagengesetz (FZulG).', L, W);
    subPoint(doc, 1, 2, 'Der Auftragnehmer unterst\u00FCtzt den Auftraggeber insbesondere bei der Erstbewertung potenziell beg\u00FCnstigter Forschungs- und Entwicklungsvorhaben, der strukturierten Erfassung und Aufbereitung projektbezogener Informationen, der Erstellung und Formulierung von Antrags- und Begleitunterlagen f\u00FCr die Bescheinigungsstelle Forschungszulage (BSFZ), der Begleitung des Bescheinigungsverfahrens sowie \u2013 soweit vereinbart \u2013 bei R\u00FCckfragen des Finanzamts.', L, W);
    subPoint(doc, 1, 3, 'Der Auftragnehmer schuldet eine fachliche Beratungs- und Unterst\u00FCtzungsleistung im Sinne eines Dienstvertrages. Ein bestimmter beh\u00F6rdlicher, steuerlicher oder wirtschaftlicher Erfolg wird nicht geschuldet.', L, W);
    subPoint(doc, 1, 4, 'Die Entscheidung \u00FCber die Beg\u00FCnstigungsf\u00E4higkeit von Vorhaben trifft ausschlie\u00DFlich die BSFZ; die Festsetzung der Forschungszulage erfolgt durch das zust\u00E4ndige Finanzamt.', L, W);

    // § 2 Leistungsumfang des Auftragnehmers
    sectionHeading(doc, 2, 'Leistungsumfang des Auftragnehmers', L, W);
    subPoint(doc, 2, 1, 'Der Auftragnehmer erbringt \u2013 je nach Beauftragung \u2013 insbesondere folgende Leistungen:', L, W);
    bulletList(doc, [
      'Durchf\u00FChrung eines Initial-Checks zur Einsch\u00E4tzung potenziell f\u00F6rderf\u00E4higer Vorhaben.',
      'Abstimmung mit den vom Auftraggeber benannten Ansprechpartnern.',
      'Unterst\u00FCtzung bei der Definition, Strukturierung und Beschreibung von FuE-Vorhaben.',
      'Erstellung von Entw\u00FCrfen f\u00FCr Projektbeschreibungen, technische Herausforderungen, Neuheitsgrad, Risiken und Arbeitsprogramme.',
      'Zusammenstellung der f\u00FCr den Antrag erforderlichen Informationen und Unterlagen. (Aufbereitung der Arbeitsstunden)',
      'Plausibilisierung der vom Auftraggeber bereitgestellten Daten, jedoch ohne Pflicht zur eigenst\u00E4ndigen steuerlichen, rechtlichen oder technischen Vollpr\u00FCfung.',
      'Begleitung bei R\u00FCckfragen der BSFZ.',
      'Unterst\u00FCtzung bei der Vorbereitung des Antrags auf Forschungszulage gegen\u00FCber dem Finanzamt.',
      'Auf Wunsch Mitwirkung bei der Vorbereitung von Dokumentationsstrukturen f\u00FCr Folgejahre.',
    ], L, W);

    subPoint(doc, 2, 2, 'Nicht geschuldet sind insbesondere:', L, W);
    bulletList(doc, [
      'Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes.',
      'Steuerliche Beratung oder Vertretung, soweit diese gesetzlichen Berufstr\u00E4gern vorbehalten ist.',
      'Die Erstellung oder Abgabe von Steuererkl\u00E4rungen.',
      'Die eigenverantwortliche F\u00FChrung der Korrespondenz gegen\u00FCber dem Finanzamt ohne gesonderte Vollmacht und separate Vereinbarung.',
      'Die Pr\u00FCfung handels-, bilanz-, arbeits- oder gesellschaftsrechtlicher Sachverhalte.',
      'Technische oder wissenschaftliche Gutachten.',
      'Die Beschaffung fehlender Nachweise oder Daten beim Auftraggeber oder Dritten.',
    ], L, W);

    subPoint(doc, 2, 3, 'Der Auftragnehmer ist berechtigt, zur Leistungserbringung qualifizierte Mitarbeiter sowie Unterauftragnehmer einzusetzen.', L, W);
    subPoint(doc, 2, 4, 'Sofern der Auftragnehmer Muster, Checklisten, Textbausteine, Strukturierungsvorschl\u00E4ge oder sonstige Vorlagen bereitstellt, dienen diese ausschlie\u00DFlich der vertragsgegenst\u00E4ndlichen Zusammenarbeit.', L, W);

    // § 3 Mitwirkungspflichten des Auftraggebers
    sectionHeading(doc, 3, 'Mitwirkungspflichten des Auftraggebers', L, W);
    subPoint(doc, 3, 1, 'Der Auftraggeber ist verpflichtet, alle f\u00FCr die Leistungserbringung erforderlichen Informationen, Unterlagen, Ausk\u00FCnfte und Zug\u00E4nge vollst\u00E4ndig, richtig und rechtzeitig bereitzustellen.', L, W);
    subPoint(doc, 3, 2, 'Der Auftraggeber benennt mindestens einen fachlich und organisatorisch geeigneten Ansprechpartner, der berechtigt ist, Informationen zu liefern, Abstimmungen vorzunehmen und Freigaben zu erteilen.', L, W);
    subPoint(doc, 3, 3, 'Der Auftraggeber ist verpflichtet:', L, W);
    bulletList(doc, [
      'projektbezogene \u00C4nderungen unverz\u00FCglich mitzuteilen;',
      'alle vom Auftragnehmer erstellten Entw\u00FCrfe, Unterlagen und Angaben vor Einreichung sorgf\u00E4ltig zu pr\u00FCfen;',
      'Freigaben rechtzeitig zu erteilen;',
      'auf R\u00FCckfragen des Auftragnehmers oder der Beh\u00F6rden z\u00FCgig zu reagieren.',
    ], L, W);
    subPoint(doc, 3, 4, 'Der Auftraggeber tr\u00E4gt die Verantwortung f\u00FCr die sachliche Richtigkeit, Vollst\u00E4ndigkeit und rechtliche Zul\u00E4ssigkeit s\u00E4mtlicher von ihm oder in seinem Namen bereitgestellter Informationen und Unterlagen.', L, W);
    subPoint(doc, 3, 5, 'Kommt der Auftraggeber seinen Mitwirkungspflichten nicht, nicht vollst\u00E4ndig oder nicht rechtzeitig nach, verl\u00E4ngern sich vereinbarte Fristen und Termine angemessen.', L, W);
    subPoint(doc, 3, 6, 'Mehrkosten, die durch unrichtige, unvollst\u00E4ndige oder versp\u00E4tete Angaben des Auftraggebers entstehen, kann der Auftragnehmer nach Aufwand gem\u00E4\u00DF der jeweils vereinbarten Verg\u00FCtungsregelung zus\u00E4tzlich abrechnen.', L, W);

    // § 4 Ablauf des Mandats / Verfahrens
    sectionHeading(doc, 4, 'Ablauf des Mandats / Verfahrens', L, W);
    subPoint(doc, 4, 1, 'Die Parteien wirken zusammen, um die f\u00FCr das jeweilige (oder vergangene Wirtschaftsjahre) Wirtschaftsjahr relevanten FuE-Vorhaben strukturiert aufzubereiten.', L, W);
    subPoint(doc, 4, 2, 'Der Auftraggeber ist dar\u00FCber informiert, dass die Beg\u00FCnstigungsf\u00E4higkeit von Vorhaben durch die BSFZ beurteilt wird und der Antrag auf Forschungszulage in einem zweiten Schritt beim zust\u00E4ndigen Finanzamt zu stellen ist.', L, W);
    subPoint(doc, 4, 3, 'Soweit mehrere Vorhaben oder mehrere Wirtschaftsjahre betroffen sind, wird der Auftragnehmer diese nach praktischer Zweckm\u00E4\u00DFigkeit b\u00FCndeln oder getrennt bearbeiten.', L, W);
    subPoint(doc, 4, 4, 'Der Auftragnehmer ist berechtigt, Leistungen zur\u00FCckzustellen, solange erforderliche Mitwirkungshandlungen oder Unterlagen des Auftraggebers fehlen.', L, W);

    // § 5 Vergütung
    sectionHeading(doc, 5, 'Verg\u00FCtung', L, W);
    subPoint(doc, 5, 1, `F\u00FCr die vertragsgegenst\u00E4ndlichen Leistungen erh\u00E4lt der Auftragnehmer eine erfolgsabh\u00E4ngige Verg\u00FCtung in H\u00F6he von ${rate.toFixed(1)}% auf die bescheinigten Projektkosten.`, L, W);
    subPoint(doc, 5, 2, 'Soweit die Parteien Abschlagszahlungen vereinbaren, gilt:', L, W);
    bulletList(doc, [
      `${pctB}% der Verg\u00FCtung werden f\u00E4llig mit dem Erhalt der positiven F&E Bescheinigung.`,
      `${pctF}% werden f\u00E4llig nach Festsetzung der Forschungszulage durch das Finanzamt.`,
    ], L, W);
    subPoint(doc, 5, 3, 'Alle Preise verstehen sich zuz\u00FCglich gesetzlicher Umsatzsteuer.', L, W);
    subPoint(doc, 5, 4, `S\u00E4mtliche Rechnungen sind zahlbar innerhalb von ${zf} Tagen ab Rechnungsdatum ohne Abzug.`, L, W);

    // § 6 Keine Erfolgsgarantie / Behördenentscheidungen
    sectionHeading(doc, 6, 'Keine Erfolgsgarantie / Beh\u00F6rdenentscheidungen', L, W);
    subPoint(doc, 6, 1, 'Der Auftragnehmer schuldet keinen bestimmten wirtschaftlichen, steuerlichen oder beh\u00F6rdlichen Erfolg.', L, W);
    subPoint(doc, 6, 2, 'Insbesondere \u00FCbernimmt der Auftragnehmer keine Gew\u00E4hr daf\u00FCr:', L, W);
    bulletList(doc, [
      'dass ein Vorhaben als beg\u00FCnstigtes FuE-Vorhaben eingestuft wird;',
      'dass eine bestimmte Bemessungsgrundlage anerkannt wird;',
      'dass eine bestimmte Forschungszulage festgesetzt oder ausgezahlt wird;',
      'dass eine Pr\u00FCfung durch BSFZ oder Finanzamt ohne R\u00FCckfragen oder K\u00FCrzungen erfolgt.',
    ], L, W);
    subPoint(doc, 6, 3, 'Bewertungen des Auftragnehmers stellen fachliche Einsch\u00E4tzungen auf Grundlage der vom Auftraggeber bereitgestellten Informationen dar.', L, W);

    // § 7 Haftung
    sectionHeading(doc, 7, 'Haftung', L, W);
    subPoint(doc, 7, 1, 'Der Auftragnehmer haftet unbeschr\u00E4nkt bei Vorsatz und grober Fahrl\u00E4ssigkeit, bei Verletzung von Leben, K\u00F6rper oder Gesundheit sowie in sonstigen gesetzlich zwingenden F\u00E4llen.', L, W);
    subPoint(doc, 7, 2, 'Bei einfacher Fahrl\u00E4ssigkeit haftet der Auftragnehmer nur bei Verletzung einer wesentlichen Vertragspflicht; in diesem Fall ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt.', L, W);
    subPoint(doc, 7, 3, 'Die Haftung f\u00FCr entgangenen Gewinn, ausgebliebene Steuer- oder F\u00F6rdervorteile, mittelbare Sch\u00E4den, Mangelfolgesch\u00E4den und sonstige reine Verm\u00F6gensfolgesch\u00E4den ist bei einfacher Fahrl\u00E4ssigkeit ausgeschlossen, soweit gesetzlich zul\u00E4ssig.', L, W);
    subPoint(doc, 7, 4, `Die Haftung ist \u2013 au\u00DFer in den F\u00E4llen unbeschr\u00E4nkter Haftung \u2013 der H\u00F6he nach auf EUR ${fmtEurInt(haftSf)} pro Schadensfall und EUR ${fmtEurInt(haftKj)} pro Kalenderjahr begrenzt.`, L, W);
    subPoint(doc, 7, 5, 'Die vorstehenden Haftungsbeschr\u00E4nkungen gelten auch zugunsten der gesetzlichen Vertreter, Mitarbeiter und Erf\u00FCllungsgehilfen des Auftragnehmers.', L, W);

    // § 8 Freistellung
    sectionHeading(doc, 8, 'Freistellung', L, W);
    subPoint(doc, 8, 1, 'Der Auftraggeber stellt den Auftragnehmer von s\u00E4mtlichen Anspr\u00FCchen Dritter frei, die darauf beruhen, dass vom Auftraggeber bereitgestellte Informationen, Unterlagen oder Freigaben unrichtig, unvollst\u00E4ndig, irref\u00FChrend oder rechtswidrig waren.', L, W);
    subPoint(doc, 8, 2, 'Die Freistellung umfasst auch angemessene Kosten der Rechtsverteidigung.', L, W);

    // § 9 Vertraulichkeit
    sectionHeading(doc, 9, 'Vertraulichkeit', L, W);
    subPoint(doc, 9, 1, 'Beide Parteien verpflichten sich, alle ihnen im Zusammenhang mit diesem Vertrag bekannt gewordenen vertraulichen Informationen der jeweils anderen Partei streng vertraulich zu behandeln.', L, W);
    subPoint(doc, 9, 2, 'Als vertraulich gelten insbesondere:', L, W);
    bulletList(doc, [
      'technische, betriebliche und kaufm\u00E4nnische Informationen;',
      'Projektinhalte, Entwicklungsst\u00E4nde, Personal- und Kostendaten;',
      'Unterlagen, Kalkulationen, Antr\u00E4ge, Entw\u00FCrfe und Bescheide.',
    ], L, W);
    subPoint(doc, 9, 3, 'Die Vertraulichkeitsverpflichtung gilt nicht f\u00FCr Informationen, die allgemein bekannt sind oder ohne Versto\u00DF gegen diesen Vertrag allgemein bekannt werden, der empfangenden Partei bereits rechtm\u00E4\u00DFig bekannt waren, von einem berechtigten Dritten rechtm\u00E4\u00DFig erlangt wurden oder aufgrund gesetzlicher Vorschriften offengelegt werden m\u00FCssen.', L, W);
    subPoint(doc, 9, 4, 'Die Verpflichtung besteht \u00FCber die Beendigung des Vertrages hinaus f\u00FCr f\u00FCnf Jahre fort; Gesch\u00E4ftsgeheimnisse sind dar\u00FCber hinaus so lange zu sch\u00FCtzen, wie ihr Geheimnischarakter besteht.', L, W);

    // § 10 Datenschutz
    sectionHeading(doc, 10, 'Datenschutz', L, W);
    subPoint(doc, 10, 1, 'Die Parteien beachten die jeweils anwendbaren datenschutzrechtlichen Vorschriften, insbesondere die DSGVO und das BDSG.', L, W);
    subPoint(doc, 10, 2, 'Soweit der Auftragnehmer im Rahmen dieses Vertrages personenbezogene Daten im Auftrag des Auftraggebers verarbeitet, schlie\u00DFen die Parteien vor Beginn der Verarbeitung einen gesonderten Vertrag zur Auftragsverarbeitung, sofern gesetzlich erforderlich.', L, W);
    subPoint(doc, 10, 3, 'Der Auftraggeber sichert zu, zur \u00DCbermittlung personenbezogener Daten an den Auftragnehmer berechtigt zu sein.', L, W);

    // § 11 Nutzungsrechte an Arbeitsergebnissen
    sectionHeading(doc, 11, 'Nutzungsrechte an Arbeitsergebnissen', L, W);
    subPoint(doc, 11, 1, 'Der Auftraggeber erh\u00E4lt an den im Rahmen dieses Vertrages individuell f\u00FCr ihn erstellten Arbeitsergebnissen ein einfaches, nicht \u00FCbertragbares Nutzungsrecht f\u00FCr eigene interne Gesch\u00E4ftszwecke.', L, W);
    subPoint(doc, 11, 2, 'Allgemeine Methoden, Vorlagen, Strukturen, Checklisten, Formulierungsbausteine, Know-how, Prozesse und nicht kundenspezifische Arbeitsmittel des Auftragnehmers verbleiben im Eigentum und in den Rechten des Auftragnehmers.', L, W);
    subPoint(doc, 11, 3, 'Eine Weitergabe oder kommerzielle Nutzung der Arbeitsergebnisse au\u00DFerhalb des eigenen Unternehmens des Auftraggebers bedarf der vorherigen Zustimmung des Auftragnehmers in Textform.', L, W);

    // § 12 Referenznennung
    sectionHeading(doc, 12, 'Referenznennung', L, W);
    subPoint(doc, 12, 1, 'Der Auftragnehmer ist nur mit vorheriger ausdr\u00FCcklicher Zustimmung des Auftraggebers berechtigt, dessen Firma und Logo als Referenz zu verwenden.', L, W);
    subPoint(doc, 12, 2, 'Die Zustimmung kann jederzeit mit Wirkung f\u00FCr die Zukunft widerrufen werden.', L, W);

    // § 13 Vertragslaufzeit
    sectionHeading(doc, 13, 'Vertragslaufzeit', L, W);
    subPoint(doc, 13, 1, 'Der Vertrag beginnt mit Unterzeichnung durch beide Parteien.', L, W);
    subPoint(doc, 13, 2, `Er wird f\u00FCr die Dauer von ${dur} geschlossen.`, L, W);
    subPoint(doc, 13, 3, `Bei einer festen Erstlaufzeit von ${dur} verl\u00E4ngert sich der Vertrag jeweils um weitere 12 Monate, sofern er nicht mit einer Frist von einem Monat zum Ende der jeweiligen Laufzeit in Textform gek\u00FCndigt wird.`, L, W);
    subPoint(doc, 13, 4, 'Das Recht zur au\u00DFerordentlichen K\u00FCndigung aus wichtigem Grund bleibt unber\u00FChrt.', L, W);
    subPoint(doc, 13, 5, 'Ein wichtiger Grund liegt f\u00FCr den Auftragnehmer insbesondere vor, wenn:', L, W);
    bulletList(doc, [
      'der Auftraggeber trotz Fristsetzung wesentliche Mitwirkungspflichten verletzt;',
      'der Auftraggeber mit f\u00E4lligen Zahlungen trotz Mahnung in Verzug ger\u00E4t;',
      'sich herausstellt, dass bereitgestellte Angaben wesentlich unrichtig oder unvollst\u00E4ndig waren.',
    ], L, W);

    // § 14 Folgen der Vertragsbeendigung
    sectionHeading(doc, 14, 'Folgen der Vertragsbeendigung', L, W);
    subPoint(doc, 14, 1, 'Bei Vertragsbeendigung verg\u00FCtet der Auftraggeber alle bis zum Beendigungszeitpunkt erbrachten Leistungen sowie bereits angefallenen Mehraufwand.', L, W);
    subPoint(doc, 14, 2, 'Sofern eine erfolgsabh\u00E4ngige Verg\u00FCtung vereinbart wurde und der Vertrag nach wesentlicher Vorarbeit des Auftragnehmers durch den Auftraggeber ohne wichtigen, vom Auftragnehmer zu vertretenden Grund beendet wird, hat der Auftragnehmer Anspruch auf die bis dahin angefallene Mindestverg\u00FCtung.', L, W);
    subPoint(doc, 14, 3, 'Herausgabeansprüche des Auftraggebers bestehen nur hinsichtlich der von ihm zur Verfügung gestellten und noch vorhandenen Unterlagen sowie hinsichtlich der final freigegebenen, für ihn erstellten Arbeitsergebnisse.', L, W);

    // § 15 Kommunikation / Textform
    sectionHeading(doc, 15, 'Kommunikation / Textform', L, W);
    subPoint(doc, 15, 1, 'Rechtserhebliche Erkl\u00E4rungen nach diesem Vertrag, insbesondere K\u00FCndigungen, Fristsetzungen, Freigaben, \u00C4nderungsvereinbarungen und Leistungsanzeigen, bed\u00FCrfen mindestens der Textform, soweit nicht gesetzlich eine strengere Form vorgeschrieben ist.', L, W);
    subPoint(doc, 15, 2, 'E-Mail gen\u00FCgt der Textform, sofern sich Absender und Inhalt der Erkl\u00E4rung hinreichend ergeben.', L, W);

    // § 16 Schlussbestimmungen
    sectionHeading(doc, 16, 'Schlussbestimmungen', L, W);
    subPoint(doc, 16, 1, '\u00C4nderungen und Erg\u00E4nzungen dieses Vertrages bed\u00FCrfen der Textform. Dies gilt auch f\u00FCr die \u00C4nderung dieser Klausel, soweit gesetzlich zul\u00E4ssig.', L, W);
    subPoint(doc, 16, 2, 'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.', L, W);
    subPoint(doc, 16, 3, 'Ist der Auftraggeber Kaufmann, juristische Person des \u00F6ffentlichen Rechts oder \u00F6ffentlich-rechtliches Sonderverm\u00F6gen, ist ausschlie\u00DFlicher Gerichtsstand f\u00FCr alle Streitigkeiten aus und im Zusammenhang mit diesem Vertrag der Sitz des Auftragnehmers.', L, W);
    subPoint(doc, 16, 4, 'Sollten einzelne Bestimmungen dieses Vertrages ganz oder teilweise unwirksam, undurchf\u00FChrbar oder nicht durchsetzbar sein oder werden, bleibt die Wirksamkeit der \u00FCbrigen Bestimmungen unber\u00FChrt.', L, W);

    // ════════════════════════════════════════════════════
    // SIGNATURES — check space, new page if needed
    // ════════════════════════════════════════════════════
    const remainingSpace = doc.page.height - doc.y - doc.page.margins.bottom;
    if (remainingSpace < 140) {
      doc.addPage();
    }

    const sigTop = doc.y + 30;
    doc.moveTo(L, sigTop).lineTo(R, sigTop).strokeColor(borderColor).lineWidth(0.5).stroke();

    const sW = (W - 40) / 2;
    const sY = sigTop + 18;

    doc.fontSize(7).font('Helvetica-Bold').fillColor(gray)
      .text('AUFTRAGGEBER', L, sY, { lineBreak: false });
    doc.moveTo(L, sY + 40).lineTo(L + sW, sY + 40).strokeColor(borderColor).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(light)
      .text('Ort, Datum, Unterschrift', L, sY + 44, { lineBreak: false });

    const sR = L + sW + 40;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(gray)
      .text('AUFTRAGNEHMER', sR, sY, { lineBreak: false });
    doc.moveTo(sR, sY + 40).lineTo(sR + sW, sY + 40).strokeColor(borderColor).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(light)
      .text('Ort, Datum, Unterschrift', sR, sY + 44, { lineBreak: false });

    // ════════════════════════════════════════════════════
    // LAST PAGE — Berechnungsbeispiel
    // ════════════════════════════════════════════════════
    doc.addPage();

    const exAmt = 1000000;
    const forschungszulage = exAmt * (fq / 100);
    let fee, feeLabel;
    if (variante === 'A') {
      fee = exAmt * (rate / 100);
      feeLabel = `Verg\u00FCtung (${rate.toFixed(1)}%)`;
    } else {
      fee = forschungszulage * (rateB / 100);
      feeLabel = `Verg\u00FCtung (${rateB.toFixed(1)}% d. FZ)`;
    }
    const p1 = fee * (pctB / 100);
    const p2 = fee * (pctF / 100);

    const bx = L;
    const bw = W;
    const bt = 30;
    const bp = 14;
    const colGap = 14;
    const innerPad = bp + 8;
    const iw = bw - innerPad - bp;
    const colW2 = (iw - colGap) / 2;
    const bh = 248;

    doc.save();
    doc.roundedRect(bx, bt, bw, bh, 5).fillColor(boxBg).fill();
    doc.roundedRect(bx, bt, bw, bh, 5).strokeColor(boxBorder).lineWidth(0.75).stroke();
    doc.roundedRect(bx, bt + 5, 3.5, bh - 10, 2).fillColor(navy).fill();
    doc.restore();

    const ix = bx + innerPad;
    y = bt + bp;

    doc.fontSize(11).font('Helvetica-Bold').fillColor(navy).text('Berechnungsbeispiel', ix, y);
    y += 15;

    doc.fontSize(7.5).font('Helvetica').fillColor(gray)
      .text(
        'Exemplarische Darstellung auf Basis angenommener bescheinigter Projektkosten von 1.000.000 \u20AC.',
        ix, y, { width: iw, lineGap: 2 }
      );
    y += 14;

    doc.roundedRect(ix, y, iw, 17, 3).fillColor(navy).fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('BESCHEINIGTE PROJEKTKOSTEN (BEISPIEL)', ix + 10, y + 5);
    doc.text(fmtEur(exAmt), ix, y + 5, { width: iw - 10, align: 'right' });
    y += 24;

    const leftX = ix;
    const rightX = ix + colW2 + colGap;
    const colTop = y;

    doc.save();
    const divX = ix + colW2 + colGap / 2;
    doc.moveTo(divX, colTop).lineTo(divX, colTop + 148)
      .strokeColor(boxBorder).lineWidth(0.5).dash(3, { space: 2 }).stroke();
    doc.restore();

    // LEFT COLUMN: Ihre Forschungszulage
    let ly = colTop;
    doc.roundedRect(leftX, ly, colW2, 15, 2).fillColor(greenSurface).fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor(greenDark)
      .text('IHRE FORSCHUNGSZULAGE', leftX + 8, ly + 4, { width: colW2 - 16 });
    ly += 22;

    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text('Bescheinigte Projektkosten', leftX + 8, ly);
    ly += 12;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(exAmt), leftX + 8, ly);
    ly += 18;

    doc.roundedRect(leftX, ly, colW2, 30, 3).fillColor(greenSurface).fill();
    doc.roundedRect(leftX, ly, colW2, 30, 3).strokeColor(greenBorder).lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor(greenDark)
      .text(`Forschungszulage (${fq}%)`, leftX + 8, ly + 4);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(greenAccent)
      .text(fmtEur(forschungszulage), leftX + 8, ly + 16);
    ly += 36;

    doc.fontSize(7).font('Helvetica-Oblique').fillColor(light)
      .text('Erstattung vom Finanzamt', leftX + 8, ly);

    // RIGHT COLUMN: Unsere Vergütung
    let ry = colTop;
    doc.roundedRect(rightX, ry, colW2, 15, 2).fillColor(blueSurface).fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor(blue)
      .text('UNSERE VERG\u00DCTUNG', rightX + 8, ry + 4, { width: colW2 - 16 });
    ry += 22;

    doc.roundedRect(rightX, ry, colW2, 26, 3).fillColor(blueSurface).fill();
    doc.roundedRect(rightX, ry, colW2, 26, 3).strokeColor(blueBorder).lineWidth(0.5).stroke();
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(blue)
      .text(feeLabel, rightX + 8, ry + 3);
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor(blue)
      .text(fmtEur(fee), rightX + 8, ry + 14);
    ry += 32;

    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text(`1. Zahlung \u2014 ${pctB}% Bewilligung`, rightX + 8, ry);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(p1), rightX, ry, { width: colW2 - 8, align: 'right' });
    ry += 14;

    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text(`2. Zahlung \u2014 ${pctF}% Finanzamt`, rightX + 8, ry);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(p2), rightX, ry, { width: colW2 - 8, align: 'right' });
    ry += 18;

    doc.moveTo(rightX + 6, ry).lineTo(rightX + colW2 - 6, ry)
      .strokeColor(navy).lineWidth(1).stroke();
    ry += 8;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(navy)
      .text('Gesamt', rightX + 8, ry);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(navy)
      .text(fmtEur(fee), rightX, ry, { width: colW2 - 8, align: 'right' });

    doc.fontSize(7).font('Helvetica-Oblique').fillColor(light)
      .text('Verg\u00FCtung netto zzgl. gesetzlicher USt.', rightX + 8, bt + bh - bp - 4);

    // ── Footer on every page ──
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 5, doc.page.width, 1.5).fill(cyan);
      doc.rect(0, doc.page.height - 3.5, doc.page.width, 3.5).fill(navy);
      doc.fontSize(6.5).font('Helvetica').fillColor(light)
        .text(
          'Novaris Consulting GmbH  \u00B7  Beratung f\u00FCr Forschungszulagen  \u00B7  novaris-consulting.com',
          L, doc.page.height - 22, { width: W, align: 'center', height: 12, lineBreak: false }
        );
      doc.fontSize(6.5).font('Helvetica').fillColor(light)
        .text(`Seite ${i + 1} von ${range.count}`, L, doc.page.height - 22, { width: W, align: 'right', height: 12, lineBreak: false });
    }

    doc.end();
    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}

module.exports = { generateContractPdf };
