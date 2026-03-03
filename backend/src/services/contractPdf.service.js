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
  const fq = contract.foerderquote || 25;

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
    doc.font('Helvetica').fillColor(body).text('. ', { continued: true, lineGap: 2.5 });
    doc.text('Die Förderquote beträgt ', { continued: true, lineGap: 2.5 });
    doc.font('Helvetica-Bold').fillColor(navy).text(`${fq}%`, { continued: true });
    doc.font('Helvetica').fillColor(body).text('.', { lineGap: 2.5 });

    doc.y += 3;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(dark).text('Zahlungsziele:', L, doc.y);
    doc.fontSize(9).font('Helvetica').fillColor(body);
    doc.text(`    •  ${pctB}% fällig nach Bewilligung durch die BSFZ`, L, doc.y + 2, { lineGap: 2 });
    doc.text(`    •  ${pctF}% fällig nach Einreichung beim Finanzamt`, { lineGap: 2 });
    doc.y += 2;
    doc.text('Zahlung jeweils innerhalb von 14 Tagen nach Rechnungsstellung.', { lineGap: 2.5 });

    // ════════════════════════════════════════════════════
    // CALCULATION EXAMPLE — Two-column layout
    // ════════════════════════════════════════════════════
    doc.y += 10;

    const exAmt = 1000000;
    const forschungszulage = exAmt * (fq / 100);
    const fee = exAmt * (rate / 100);
    const p1 = fee * (pctB / 100);
    const p2 = fee * (pctF / 100);

    const bx = L;
    const bw = W;
    const bt = doc.y;
    const bp = 14;
    const colGap = 14;
    const innerPad = bp + 8; // left accent + padding
    const iw = bw - innerPad - bp; // inner width
    const colW = (iw - colGap) / 2;
    const bh = 248;

    // Outer box
    doc.save();
    doc.roundedRect(bx, bt, bw, bh, 5).fillColor('#f0f4fa').fill();
    doc.roundedRect(bx, bt, bw, bh, 5).strokeColor('#c7d2e4').lineWidth(0.75).stroke();
    doc.roundedRect(bx, bt + 5, 3.5, bh - 10, 2).fillColor(navy).fill();
    doc.restore();

    const ix = bx + innerPad;
    y = bt + bp;

    // Title
    doc.fontSize(11).font('Helvetica-Bold').fillColor(navy).text('Berechnungsbeispiel', ix, y);
    y += 15;

    // Description
    doc.fontSize(7.5).font('Helvetica').fillColor(gray)
      .text(
        'Exemplarische Darstellung auf Basis angenommener bescheinigter Projektkosten von 1.000.000 €.',
        ix, y, { width: iw, lineGap: 2 }
      );
    y += 14;

    // Full-width base amount bar
    doc.roundedRect(ix, y, iw, 17, 3).fillColor(navy).fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('BESCHEINIGTE PROJEKTKOSTEN (BEISPIEL)', ix + 10, y + 5);
    doc.text(fmtEur(exAmt), ix, y + 5, { width: iw - 10, align: 'right' });
    y += 24;

    // ── Two columns ──
    const leftX = ix;
    const rightX = ix + colW + colGap;
    const colTop = y;

    // Vertical dashed divider
    doc.save();
    const divX = ix + colW + colGap / 2;
    doc.moveTo(divX, colTop).lineTo(divX, colTop + 148)
      .strokeColor('#c7d2e4').lineWidth(0.5).dash(3, { space: 2 }).stroke();
    doc.restore();

    // ═══ LEFT COLUMN: Ihre Forschungszulage ═══
    let ly = colTop;

    doc.roundedRect(leftX, ly, colW, 15, 2).fillColor('#d1fae5').fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#065f46')
      .text('IHRE FORSCHUNGSZULAGE', leftX + 8, ly + 4, { width: colW - 16 });
    ly += 22;

    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text('Bescheinigte Projektkosten', leftX + 8, ly);
    ly += 12;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(exAmt), leftX + 8, ly);
    ly += 18;

    // Forschungszulage highlight
    doc.roundedRect(leftX, ly, colW, 30, 3).fillColor('#d1fae5').fill();
    doc.roundedRect(leftX, ly, colW, 30, 3).strokeColor('#6ee7b7').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#065f46')
      .text(`Forschungszulage (${fq}%)`, leftX + 8, ly + 4);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#059669')
      .text(fmtEur(forschungszulage), leftX + 8, ly + 16);
    ly += 36;

    doc.fontSize(7).font('Helvetica-Oblique').fillColor(light)
      .text('Erstattung vom Finanzamt', leftX + 8, ly);

    // ═══ RIGHT COLUMN: Unsere Vergütung ═══
    let ry = colTop;

    doc.roundedRect(rightX, ry, colW, 15, 2).fillColor('#dbeafe').fill();
    doc.fontSize(7).font('Helvetica-Bold').fillColor(blue)
      .text('UNSERE VERGÜTUNG', rightX + 8, ry + 4, { width: colW - 16 });
    ry += 22;

    // Fee highlight
    doc.roundedRect(rightX, ry, colW, 26, 3).fillColor('#dbeafe').fill();
    doc.roundedRect(rightX, ry, colW, 26, 3).strokeColor('#93c5fd').lineWidth(0.5).stroke();
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(blue)
      .text(`Vergütung (${rate.toFixed(1)}%)`, rightX + 8, ry + 3);
    doc.fontSize(10.5).font('Helvetica-Bold').fillColor(blue)
      .text(fmtEur(fee), rightX + 8, ry + 14);
    ry += 32;

    // Payment 1
    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text(`1. Zahlung — ${pctB}% Bewilligung`, rightX + 8, ry);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(p1), rightX, ry, { width: colW - 8, align: 'right' });
    ry += 14;

    // Payment 2
    doc.fontSize(8).font('Helvetica').fillColor(gray)
      .text(`2. Zahlung — ${pctF}% Finanzamt`, rightX + 8, ry);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(dark)
      .text(fmtEur(p2), rightX, ry, { width: colW - 8, align: 'right' });
    ry += 18;

    // Total line
    doc.moveTo(rightX + 6, ry).lineTo(rightX + colW - 6, ry)
      .strokeColor(navy).lineWidth(1).stroke();
    ry += 8;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(navy)
      .text('Gesamt', rightX + 8, ry);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(navy)
      .text(fmtEur(fee), rightX, ry, { width: colW - 8, align: 'right' });

    // Footnote — only applies to Novaris fee (right column)
    doc.fontSize(7).font('Helvetica-Oblique').fillColor(light)
      .text('Vergütung netto zzgl. gesetzlicher USt.', rightX + 8, bt + bh - bp - 4);

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
