const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/contracts');

function ensureDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtEur(v) {
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

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

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 58, right: 58 },
      bufferPages: true,
      info: { Title: `Dienstleistungsvertrag ${contract.contractNumber}`, Author: 'Novaris Consulting GmbH' },
    });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Colors
    const navy = '#0D1B3E';
    const blue = '#1E56B5';
    const cyan = '#4DAEE5';
    const dark = '#0f172a';
    const body = '#334155';
    const gray = '#64748b';
    const light = '#94a3b8';
    const border = '#d4dced';
    const surface = '#f1f5fb';
    const W = doc.page.width - 116; // pageWidth
    const L = 58; // left margin
    const R = doc.page.width - 58; // right edge

    // ════════════════════════════════════════════════════
    // PAGE 1
    // ════════════════════════════════════════════════════

    // Top band
    doc.rect(0, 0, doc.page.width, 5).fill(navy);
    doc.rect(0, 5, doc.page.width, 1.5).fill(cyan);

    // Company name
    let y = 32;
    doc.fontSize(20).font('Helvetica-Bold').fillColor(navy)
      .text('NOVARIS', L, y, { continued: true });
    doc.font('Helvetica').fillColor(blue).text(' CONSULTING');
    doc.fontSize(7.5).font('Helvetica').fillColor(gray)
      .text('Beratung für Forschungszulagen  ·  Forschungszulagengesetz (FZulG)');

    // Accent divider
    y = doc.y + 6;
    doc.moveTo(L, y).lineTo(L + 45, y).strokeColor(cyan).lineWidth(2).stroke();
    doc.moveTo(L + 49, y).lineTo(R, y).strokeColor(border).lineWidth(0.5).stroke();

    // Title
    y += 14;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(navy)
      .text('Dienstleistungsvertrag', L, y, { width: W, align: 'center' });
    y = doc.y + 4;
    doc.fontSize(8.5).font('Helvetica').fillColor(gray)
      .text(`${contract.contractNumber}  ·  ${formatDate(contract.createdAt)}`, L, y, { width: W, align: 'center' });

    // ── § 1 ──
    y = doc.y + 14;
    doc.y = y;
    heading(doc, '§ 1  Vertragsparteien', navy, cyan, L, W);
    y = doc.y + 5;

    // Two-column parties — compact
    const cW = (W - 20) / 2;
    drawPartyBox(doc, L, y, cW, 'AUFTRAGGEBER', companyName, addr, { navy: dark, gray, border, surface });
    drawPartyBox(doc, L + cW + 20, y, cW, 'AUFTRAGNEHMER', 'Novaris Consulting GmbH', 'Beratung für Forschungszulagen', { navy: dark, gray, border, surface });

    // ── § 2 ──
    y += 54;
    doc.y = y;
    heading(doc, '§ 2  Vertragsgegenstand', navy, cyan, L, W);
    doc.fontSize(9).font('Helvetica').fillColor(body)
      .text(
        `Gegenstand dieses Vertrages ist die Beratung und Unterstützung des Auftraggebers bei der ` +
        `Beantragung der Forschungszulage gemäß dem FZulG. Der Auftragnehmer unterstützt bei der ` +
        `Identifizierung förderfähiger F&E-Vorhaben, der Erstellung der Antragsunterlagen sowie der ` +
        `Kommunikation mit der BSFZ und dem zuständigen Finanzamt.`,
        L, doc.y + 4, { width: W, lineGap: 2.5 }
      );

    // ── § 3 ──
    doc.y = doc.y + 10;
    heading(doc, '§ 3  Vertragslaufzeit', navy, cyan, L, W);
    doc.fontSize(9).font('Helvetica').fillColor(body)
      .text(
        `Die Vertragslaufzeit beträgt ${dur} ab Unterzeichnung. Der Vertrag verlängert sich ` +
        `automatisch um jeweils ein weiteres Jahr, sofern er nicht mit einer Frist von drei Monaten ` +
        `zum Ende der jeweiligen Laufzeit schriftlich gekündigt wird.`,
        L, doc.y + 4, { width: W, lineGap: 2.5 }
      );

    // ── § 4 ──
    doc.y = doc.y + 10;
    heading(doc, '§ 4  Vergütung', navy, cyan, L, W);
    y = doc.y + 4;
    doc.fontSize(9).font('Helvetica').fillColor(body)
      .text('Die Vergütung des Auftragnehmers beträgt ', L, y, { continued: true, lineGap: 2.5 });
    doc.font('Helvetica-Bold').fillColor(navy)
      .text(`${rate.toFixed(1)}% auf die bescheinigten Projektkosten`, { continued: true });
    doc.font('Helvetica').fillColor(body).text('.', { lineGap: 2.5 });

    doc.y += 3;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(dark).text('Zahlungsziele:', L, doc.y);
    doc.fontSize(9).font('Helvetica').fillColor(body);
    doc.text(`    •  ${pctB}% fällig nach Bewilligung durch die BSFZ`, L, doc.y + 2, { lineGap: 2 });
    doc.text(`    •  ${pctF}% fällig nach Einreichung beim Finanzamt`, { lineGap: 2 });
    doc.y += 2;
    doc.text('Zahlung jeweils innerhalb von 14 Tagen nach Rechnungsstellung.', { lineGap: 2.5 });

    // ════════════════════════════════════════════════════
    // CALCULATION EXAMPLE — prominent, professional table
    // ════════════════════════════════════════════════════
    doc.y += 10;

    const exAmt = 1000000;
    const fee = exAmt * (rate / 100);
    const p1 = fee * (pctB / 100);
    const p2 = fee * (pctF / 100);

    // If not enough room, start on page 2
    if (doc.y > doc.page.height - 220) doc.addPage();

    const bx = L;
    const bw = W;
    const bt = doc.y;
    const bp = 14; // padding

    // Measure box height
    const rh = 20; // row height
    const bh = bp + 15 + 30 + 18 + rh + rh + 8 + rh + rh + 10 + rh + 16 + bp;

    // Outer box
    doc.save();
    doc.roundedRect(bx, bt, bw, bh, 5).fillColor('#f0f4fa').fill();
    doc.roundedRect(bx, bt, bw, bh, 5).strokeColor('#c7d2e4').lineWidth(0.75).stroke();
    // Left accent stripe
    doc.roundedRect(bx, bt + 5, 3.5, bh - 10, 2).fillColor(navy).fill();
    doc.restore();

    const ix = bx + bp + 8; // inner left
    const iw = bw - bp * 2 - 8; // inner width
    y = bt + bp;

    // Title
    doc.fontSize(11).font('Helvetica-Bold').fillColor(navy).text('Berechnungsbeispiel', ix, y);
    y += 16;

    // Description
    doc.fontSize(7.5).font('Helvetica').fillColor(gray)
      .text(
        'Exemplarische Darstellung der Vergütungsstruktur auf Basis einer angenommenen ' +
        'Projektkostensumme von 1.000.000 €. Die tatsächliche Vergütung richtet sich nach ' +
        'den tatsächlich bescheinigten Projektkosten.',
        ix, y, { width: iw, lineGap: 2 }
      );
    y += 30;

    // ── Table ──
    const tw = iw; // table width
    const tx = ix;
    const tr = tx + tw; // table right edge

    // Header row
    doc.roundedRect(tx, y, tw, 17, 3).fillColor(navy).fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('POSITION', tx + 10, y + 5, { width: tw * 0.55 });
    doc.text('BETRAG', tx, y + 5, { width: tw - 10, align: 'right' });
    y += 21;

    // Row: Projektkosten
    doc.fontSize(9).font('Helvetica').fillColor(body)
      .text('Bescheinigte Projektkosten (Beispiel)', tx + 10, y + 3, { width: tw * 0.55 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(exAmt), tx, y + 3, { width: tw - 10, align: 'right' });
    y += rh;

    // Row: Vergütung (highlighted)
    doc.roundedRect(tx, y, tw, rh, 3).fillColor('#dbeafe').fill();
    doc.roundedRect(tx, y, tw, rh, 3).strokeColor('#93c5fd').lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica-Bold').fillColor(blue)
      .text(`Vergütung (${rate.toFixed(1)}%)`, tx + 10, y + 4, { width: tw * 0.55 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(blue)
      .text(fmtEur(fee), tx, y + 4, { width: tw - 10, align: 'right' });
    y += rh + 8;

    // Divider
    doc.moveTo(tx + 8, y).lineTo(tr - 8, y).strokeColor('#c7d2e4').lineWidth(0.5).stroke();
    y += 8;

    // Payment rows
    doc.fontSize(8.5).font('Helvetica').fillColor(gray)
      .text(`1. Zahlung  —  ${pctB}% bei Bewilligung (BSFZ)`, tx + 10, y + 3, { width: tw * 0.6 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(p1), tx, y + 3, { width: tw - 10, align: 'right' });
    y += rh;

    doc.fontSize(8.5).font('Helvetica').fillColor(gray)
      .text(`2. Zahlung  —  ${pctF}% bei Einreichung Finanzamt`, tx + 10, y + 3, { width: tw * 0.6 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(p2), tx, y + 3, { width: tw - 10, align: 'right' });
    y += rh + 4;

    // Total divider
    doc.moveTo(tx + 8, y).lineTo(tr - 8, y).strokeColor(navy).lineWidth(1.2).stroke();
    y += 8;

    // Total
    doc.fontSize(10).font('Helvetica-Bold').fillColor(navy)
      .text('Gesamtvergütung', tx + 10, y, { width: tw * 0.55 });
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor(navy)
      .text(fmtEur(p1 + p2), tx, y, { width: tw - 10, align: 'right' });
    y += 16;

    // Footnote
    doc.fontSize(7).font('Helvetica-Oblique').fillColor(light)
      .text('Alle Beträge netto zzgl. gesetzlicher USt.', tx + 10, y);

    doc.y = bt + bh + 12;

    // ════════════════════════════════════════════════════
    // PAGE 2 — always start fresh page for remaining sections
    // ════════════════════════════════════════════════════
    doc.addPage();
    drawPageBands(doc, navy, cyan);
    doc.y = 30;

    // ── § 5  Leistungsumfang des Auftragnehmers ──
    heading(doc, '§ 5  Leistungsumfang des Auftragnehmers', navy, cyan, L, W);
    doc.fontSize(9).font('Helvetica').fillColor(body);
    doc.text('Der Auftragnehmer erbringt insbesondere folgende Leistungen:', L, doc.y + 4, { width: W, lineGap: 2 });
    [
      'Analyse und Identifizierung förderfähiger Forschungs- und Entwicklungsvorhaben.',
      'Erstellung und Aufbereitung der vollständigen Antragsunterlagen für die BSFZ.',
      'Begleitung des Bewilligungsverfahrens und Kommunikation mit den zuständigen Stellen.',
      'Unterstützung bei der Einreichung der Forschungszulage beim zuständigen Finanzamt.',
    ].forEach(t => doc.text(`    •  ${t}`, { lineGap: 2 }));

    // ── § 6  Pflichten des Auftraggebers ──
    doc.y += 10;
    heading(doc, '§ 6  Pflichten des Auftraggebers', navy, cyan, L, W);
    doc.fontSize(9).font('Helvetica').fillColor(body);
    doc.text('Der Auftraggeber verpflichtet sich:', L, doc.y + 4, { width: W, lineGap: 2 });
    [
      'Alle erforderlichen Unterlagen und Informationen rechtzeitig und vollständig bereitzustellen.',
      'Änderungen an laufenden F&E-Vorhaben unverzüglich mitzuteilen.',
      'Die erstellten Unterlagen vor Einreichung zu prüfen und freizugeben.',
      'Einen festen Ansprechpartner für die Dauer der Zusammenarbeit zu benennen.',
    ].forEach(t => doc.text(`    •  ${t}`, { lineGap: 2 }));

    // ── § 7  Haftung ──
    doc.y += 10;
    heading(doc, '§ 7  Haftung', navy, cyan, L, W);
    doc.fontSize(9).font('Helvetica').fillColor(body)
      .text(
        'Der Auftragnehmer haftet für Schäden nur bei Vorsatz und grober Fahrlässigkeit. ' +
        'Die Haftung für mittelbare Schäden und entgangenen Gewinn ist ausgeschlossen. ' +
        'Der Auftragnehmer übernimmt keine Garantie für die Bewilligung der Forschungszulage, ' +
        'da die Entscheidung im Ermessen der zuständigen Behörden liegt.',
        L, doc.y + 4, { width: W, lineGap: 2.5 }
      );

    // ── § 8  Vertraulichkeit ──
    doc.y += 10;
    heading(doc, '§ 8  Vertraulichkeit', navy, cyan, L, W);
    doc.fontSize(9).font('Helvetica').fillColor(body)
      .text(
        'Beide Parteien verpflichten sich, alle im Rahmen dieses Vertrages erhaltenen vertraulichen ' +
        'Informationen, insbesondere Geschäfts- und Betriebsgeheimnisse, streng vertraulich zu behandeln ' +
        'und nicht an Dritte weiterzugeben. Diese Verpflichtung besteht auch nach Beendigung des Vertrages fort.',
        L, doc.y + 4, { width: W, lineGap: 2.5 }
      );

    // ── § 9  Schlussbestimmungen ──
    doc.y += 10;
    heading(doc, '§ 9  Schlussbestimmungen', navy, cyan, L, W);
    doc.fontSize(9).font('Helvetica').fillColor(body)
      .text(
        'Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz des Auftragnehmers. ' +
        'Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollten einzelne Bestimmungen ' +
        'dieses Vertrages unwirksam sein oder werden, so wird die Wirksamkeit der übrigen Bestimmungen ' +
        'hiervon nicht berührt.',
        L, doc.y + 4, { width: W, lineGap: 2.5 }
      );

    // ── Signatures — pinned to lower area of page 2 ──
    const sigTop = doc.page.height - 130;

    doc.moveTo(L, sigTop).lineTo(R, sigTop).strokeColor(border).lineWidth(0.5).stroke();

    const sW = (W - 40) / 2;
    const sY = sigTop + 18;

    // Left
    doc.fontSize(7).font('Helvetica-Bold').fillColor(gray)
      .text('AUFTRAGGEBER', L, sY, { lineBreak: false });
    doc.moveTo(L, sY + 40).lineTo(L + sW, sY + 40).strokeColor(border).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(light)
      .text('Ort, Datum, Unterschrift', L, sY + 44, { lineBreak: false });

    // Right
    const sR = L + sW + 40;
    doc.fontSize(7).font('Helvetica-Bold').fillColor(gray)
      .text('AUFTRAGNEHMER', sR, sY, { lineBreak: false });
    doc.moveTo(sR, sY + 40).lineTo(sR + sW, sY + 40).strokeColor(border).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica').fillColor(light)
      .text('Ort, Datum, Unterschrift', sR, sY + 44, { lineBreak: false });

    // ── Footer on every page ──
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Bottom bands
      doc.rect(0, doc.page.height - 5, doc.page.width, 1.5).fill(cyan);
      doc.rect(0, doc.page.height - 3.5, doc.page.width, 3.5).fill(navy);
      // Footer text — use height constraint to prevent extra page creation
      doc.fontSize(6.5).font('Helvetica').fillColor(light)
        .text(
          'Novaris Consulting GmbH  ·  Beratung für Forschungszulagen  ·  novaris-consulting.com',
          L, doc.page.height - 22, { width: W, align: 'center', height: 12, lineBreak: false }
        );
      // Page number
      doc.fontSize(6.5).font('Helvetica').fillColor(light)
        .text(`Seite ${i + 1} von ${range.count}`, L, doc.page.height - 22, { width: W, align: 'right', height: 12, lineBreak: false });
    }

    doc.end();
    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}

function heading(doc, text, navy, cyan, L, W) {
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor(navy).text(text, L, doc.y);
  const y = doc.y + 3;
  doc.moveTo(L, y).lineTo(L + 38, y).strokeColor(cyan).lineWidth(1.5).stroke();
  doc.moveTo(L + 42, y).lineTo(L + W, y).strokeColor('#d4dced').lineWidth(0.4).stroke();
  doc.y = y + 3;
}

function drawPartyBox(doc, x, y, w, label, name, detail, c) {
  doc.roundedRect(x, y, w, 48, 4).fillColor(c.surface).fill();
  doc.roundedRect(x, y, w, 48, 4).strokeColor(c.border).lineWidth(0.5).stroke();
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor(c.gray).text(label, x + 10, y + 8, { width: w - 20 });
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(c.navy).text(name, x + 10, y + 19, { width: w - 20 });
  doc.fontSize(8).font('Helvetica').fillColor(c.gray).text(detail, x + 10, y + 33, { width: w - 20 });
}

function drawPageBands(doc, navy, cyan) {
  doc.rect(0, 0, doc.page.width, 5).fill(navy);
  doc.rect(0, 5, doc.page.width, 1.5).fill(cyan);
}

module.exports = { generateContractPdf };
