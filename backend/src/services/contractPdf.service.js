const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/contracts');

function ensureDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Generate a professional contract PDF for Novaris Consulting.
 * Design aligned with novaris-consulting.com brand identity.
 */
async function generateContractPdf(contract) {
  ensureDir();

  const seqNum = contract.contractNumber.split('-').pop();
  const fileName = `Vertrag ${seqNum}.pdf`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  const relativePath = `contracts/${fileName}`;

  const companyName = contract.company?.name || 'Unbekannt';
  const fullAddress = `${contract.street} ${contract.streetNumber}, ${contract.zipCode} ${contract.city}, ${contract.country}`;
  const durationYears = contract.durationMonths >= 12
    ? `${Math.floor(contract.durationMonths / 12)} Jahr(e)${contract.durationMonths % 12 ? ` und ${contract.durationMonths % 12} Monat(e)` : ''}`
    : `${contract.durationMonths} Monat(e)`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: `Dienstleistungsvertrag ${contract.contractNumber}`,
        Author: 'Novaris Consulting GmbH',
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── Brand colors (matching novaris-consulting.com) ──
    const navy = '#0D1B3E';
    const navyLight = '#1E56B5';
    const cyan = '#4DAEE5';
    const darkText = '#0D1B3E';
    const bodyText = '#2d3748';
    const grayText = '#64748b';
    const lightGray = '#94a3b8';
    const borderColor = '#dde5f4';
    const surfaceLight = '#f5f8fe';
    const surfaceCalc = '#edf2fb';
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const mLeft = doc.page.margins.left;
    const mRight = doc.page.margins.right;

    // ── Page 1: Header band ──
    doc.rect(0, 0, doc.page.width, 6).fill(navy);
    doc.rect(0, 6, doc.page.width, 2).fill(cyan);

    // ── Company name + tagline ──
    doc.y = 40;
    doc.moveDown(1.2);
    doc.fontSize(22).font('Helvetica-Bold').fillColor(navy)
      .text('NOVARIS', mLeft, doc.y, { continued: true });
    doc.fontSize(22).font('Helvetica').fillColor(navyLight)
      .text(' CONSULTING', { continued: false });
    doc.fontSize(8.5).font('Helvetica').fillColor(grayText)
      .text('Beratung für Forschungszulagen nach dem Forschungszulagengesetz (FZulG)');

    // Divider with accent
    doc.moveDown(0.6);
    const divY = doc.y;
    doc.moveTo(mLeft, divY).lineTo(mLeft + 50, divY).strokeColor(cyan).lineWidth(2).stroke();
    doc.moveTo(mLeft + 54, divY).lineTo(doc.page.width - mRight, divY).strokeColor(borderColor).lineWidth(0.5).stroke();

    // ── Contract title block ──
    doc.moveDown(1.4);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(navy)
      .text('Dienstleistungsvertrag', { align: 'center' });
    doc.moveDown(0.3);

    // Contract meta in a subtle box
    const metaBoxY = doc.y;
    const metaBoxH = 32;
    doc.roundedRect(mLeft + pageW * 0.2, metaBoxY, pageW * 0.6, metaBoxH, 4)
      .fillColor(surfaceLight).fill();
    doc.fontSize(9).font('Helvetica').fillColor(grayText)
      .text(`Vertragsnummer: ${contract.contractNumber}  ·  Datum: ${formatDate(contract.createdAt)}`,
        mLeft, metaBoxY + 10, { width: pageW, align: 'center' });
    doc.y = metaBoxY + metaBoxH + 12;

    doc.moveDown(0.8);

    // ── § 1 Vertragsparteien ──
    sectionHeading(doc, '§ 1  Vertragsparteien', navy, cyan, mLeft, pageW);
    doc.moveDown(0.4);

    // Two-column party layout
    const colW = (pageW - 30) / 2;
    const partyY = doc.y;

    // Left: Auftraggeber
    doc.roundedRect(mLeft, partyY, colW, 58, 4).fillColor(surfaceLight).fill();
    doc.roundedRect(mLeft, partyY, colW, 58, 4).strokeColor(borderColor).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(grayText)
      .text('AUFTRAGGEBER', mLeft + 12, partyY + 10, { width: colW - 24 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
      .text(companyName, mLeft + 12, partyY + 23, { width: colW - 24 });
    doc.fontSize(8.5).font('Helvetica').fillColor(bodyText)
      .text(fullAddress, mLeft + 12, partyY + 37, { width: colW - 24 });

    // Right: Auftragnehmer
    const rightCol = mLeft + colW + 30;
    doc.roundedRect(rightCol, partyY, colW, 58, 4).fillColor(surfaceLight).fill();
    doc.roundedRect(rightCol, partyY, colW, 58, 4).strokeColor(borderColor).lineWidth(0.5).stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(grayText)
      .text('AUFTRAGNEHMER', rightCol + 12, partyY + 10, { width: colW - 24 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
      .text('Novaris Consulting GmbH', rightCol + 12, partyY + 23, { width: colW - 24 });
    doc.fontSize(8.5).font('Helvetica').fillColor(bodyText)
      .text('Beratung für Forschungszulagen', rightCol + 12, partyY + 37, { width: colW - 24 });

    doc.y = partyY + 70;
    doc.moveDown(0.6);

    // ── § 2 Vertragsgegenstand ──
    sectionHeading(doc, '§ 2  Vertragsgegenstand', navy, cyan, mLeft, pageW);
    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text(
        `Gegenstand dieses Vertrages ist die Beratung und Unterstützung des Auftraggebers bei der ` +
        `Beantragung der Forschungszulage gemäß dem Forschungszulagengesetz (FZulG). Der Auftragnehmer ` +
        `unterstützt den Auftraggeber bei der Identifizierung förderfähiger Forschungs- und ` +
        `Entwicklungsvorhaben, der Erstellung der erforderlichen Antragsunterlagen sowie der ` +
        `Kommunikation mit der Bescheinigungsstelle Forschungszulage (BSFZ) und dem zuständigen Finanzamt.`,
        { lineGap: 3.5 }
      );

    doc.moveDown(1);

    // ── § 3 Vertragslaufzeit ──
    sectionHeading(doc, '§ 3  Vertragslaufzeit', navy, cyan, mLeft, pageW);
    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text(
        `Die Vertragslaufzeit beträgt ${durationYears} ab dem Datum der Unterzeichnung dieses Vertrages. ` +
        `Der Vertrag verlängert sich automatisch um jeweils ein weiteres Jahr, sofern er nicht mit einer ` +
        `Frist von drei Monaten zum Ende der jeweiligen Vertragslaufzeit schriftlich gekündigt wird.`,
        { lineGap: 3.5 }
      );

    doc.moveDown(1);

    // ── § 4 Vergütung ──
    const pctBewilligung = contract.paymentBewilligung || 50;
    const pctFinanzamt = contract.paymentFinanzamt || 50;

    sectionHeading(doc, '§ 4  Vergütung', navy, cyan, mLeft, pageW);
    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text(
        `Die Vergütung des Auftragnehmers beträgt `,
        { continued: true, lineGap: 3.5 }
      );
    doc.font('Helvetica-Bold').fillColor(navy)
      .text(`${contract.commissionRate.toFixed(1)}% auf die bescheinigten Projektkosten`, { continued: true });
    doc.font('Helvetica').fillColor(bodyText)
      .text('.', { lineGap: 3.5 });

    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(darkText)
      .text('Zahlungsziele:', { lineGap: 3.5 });
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text(`    •  ${pctBewilligung}% der Vergütung werden fällig nach Bewilligung des Antrags durch die BSFZ.`, { lineGap: 3 });
    doc.text(`    •  ${pctFinanzamt}% der Vergütung werden fällig nach Einreichung beim Finanzamt.`, { lineGap: 3 });
    doc.moveDown(0.3);
    doc.text('Die Zahlung ist jeweils innerhalb von 14 Tagen nach Rechnungsstellung zu leisten.', { lineGap: 3.5 });

    // ────────────────────────────────────────────────────────
    // ── CALCULATION EXAMPLE (prominent, full-width box) ──
    // ────────────────────────────────────────────────────────
    doc.moveDown(0.8);

    const exampleAmount = 1000000;
    const rate = contract.commissionRate;
    const totalFee = exampleAmount * (rate / 100);
    const pay1 = totalFee * (pctBewilligung / 100);
    const pay2 = totalFee * (pctFinanzamt / 100);
    const fmtEur = (v) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

    // Check if we need a new page (need ~200pt)
    if (doc.y > doc.page.height - 260) {
      doc.addPage();
    }

    const calcBoxX = mLeft;
    const calcBoxW = pageW;
    const calcBoxTop = doc.y;
    const pad = 18;
    const rowH = 17;

    // Calculate total box height
    // Title row + description + spacer + header row + example row + fee row + divider + payment1 + payment2 + divider + total + footer text
    const calcBoxH = pad + 16 + 28 + 8 + 14 + rowH + rowH + 10 + rowH + rowH + 12 + rowH + 30 + pad;

    // Draw outer box with navy left accent
    doc.roundedRect(calcBoxX, calcBoxTop, calcBoxW, calcBoxH, 6)
      .fillColor(surfaceCalc).fill();
    doc.roundedRect(calcBoxX, calcBoxTop, calcBoxW, calcBoxH, 6)
      .strokeColor(borderColor).lineWidth(0.5).stroke();
    // Navy accent bar on left
    doc.rect(calcBoxX, calcBoxTop + 6, 4, calcBoxH - 12).fill(navy);

    let y = calcBoxTop + pad;
    const innerLeft = calcBoxX + pad + 6;
    const innerW = calcBoxW - pad * 2 - 6;
    const rightEdge = calcBoxX + calcBoxW - pad;

    // Title
    doc.fontSize(12).font('Helvetica-Bold').fillColor(navy)
      .text('Berechnungsbeispiel', innerLeft, y);
    y += 18;

    // Description
    doc.fontSize(8.5).font('Helvetica').fillColor(grayText)
      .text(
        'Die folgende Berechnung dient als exemplarische Darstellung der Vergütungsstruktur auf Basis ' +
        'einer angenommenen bescheinigten Projektkostensumme. Die tatsächliche Vergütung richtet sich ' +
        'nach den tatsächlich bescheinigten Projektkosten.',
        innerLeft, y, { width: innerW, lineGap: 2.5 }
      );
    y += 36;

    // ── Table header ──
    doc.roundedRect(innerLeft, y, innerW, 16, 3).fillColor(navy).fill();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
      .text('POSITION', innerLeft + 10, y + 4, { width: innerW * 0.6 });
    doc.text('BETRAG', innerLeft + 10, y + 4, { width: innerW - 20, align: 'right' });
    y += 22;

    // ── Example amount row ──
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text('Bescheinigte Projektkosten (Beispiel)', innerLeft + 10, y, { width: innerW * 0.6 });
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(darkText)
      .text(fmtEur(exampleAmount), innerLeft + 10, y, { width: innerW - 20, align: 'right' });
    y += rowH;

    // ── Fee row (highlighted) ──
    doc.roundedRect(innerLeft, y - 2, innerW, rowH + 2, 3).fillColor('#dbeafe').fill();
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(navyLight)
      .text(`Vergütung (${rate.toFixed(1)}%)`, innerLeft + 10, y + 1, { width: innerW * 0.6 });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(navyLight)
      .text(fmtEur(totalFee), innerLeft + 10, y + 1, { width: innerW - 20, align: 'right' });
    y += rowH + 8;

    // Thin divider
    doc.moveTo(innerLeft + 10, y).lineTo(rightEdge - 10, y)
      .strokeColor(borderColor).lineWidth(0.5).stroke();
    y += 10;

    // ── Payment 1 ──
    doc.fontSize(9).font('Helvetica').fillColor(grayText)
      .text(`1. Zahlung — ${pctBewilligung}% bei Bewilligung (BSFZ)`, innerLeft + 10, y, { width: innerW * 0.65 });
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(darkText)
      .text(fmtEur(pay1), innerLeft + 10, y, { width: innerW - 20, align: 'right' });
    y += rowH;

    // ── Payment 2 ──
    doc.fontSize(9).font('Helvetica').fillColor(grayText)
      .text(`2. Zahlung — ${pctFinanzamt}% bei Einreichung Finanzamt`, innerLeft + 10, y, { width: innerW * 0.65 });
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(darkText)
      .text(fmtEur(pay2), innerLeft + 10, y, { width: innerW - 20, align: 'right' });
    y += rowH + 6;

    // Total divider (thicker)
    doc.moveTo(innerLeft + 10, y).lineTo(rightEdge - 10, y)
      .strokeColor(navy).lineWidth(1).stroke();
    y += 8;

    // ── Total row ──
    doc.fontSize(10).font('Helvetica-Bold').fillColor(navy)
      .text('Gesamtvergütung', innerLeft + 10, y, { width: innerW * 0.6 });
    doc.fontSize(11).font('Helvetica-Bold').fillColor(navy)
      .text(fmtEur(pay1 + pay2), innerLeft + 10, y, { width: innerW - 20, align: 'right' });
    y += 18;

    // Footer note
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(lightGray)
      .text('* Alle Beträge verstehen sich als Nettobeträge zzgl. der gesetzlichen Umsatzsteuer.',
        innerLeft + 10, y, { width: innerW - 20 });

    doc.y = calcBoxTop + calcBoxH + 10;

    doc.moveDown(0.8);

    // ── § 5 Pflichten des Auftraggebers ──
    sectionHeading(doc, '§ 5  Pflichten des Auftraggebers', navy, cyan, mLeft, pageW);
    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text('Der Auftraggeber verpflichtet sich:', { lineGap: 3.5 });
    const obligations = [
      'Alle erforderlichen Unterlagen und Informationen rechtzeitig und vollständig zur Verfügung zu stellen.',
      'Änderungen an laufenden Forschungs- und Entwicklungsvorhaben unverzüglich mitzuteilen.',
      'Die im Rahmen der Beratung erstellten Unterlagen vor Einreichung zu prüfen und freizugeben.',
    ];
    obligations.forEach((item) => {
      doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
        .text(`    •  ${item}`, { lineGap: 3 });
    });

    doc.moveDown(1);

    // ── § 6 Vertraulichkeit ──
    sectionHeading(doc, '§ 6  Vertraulichkeit', navy, cyan, mLeft, pageW);
    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text(
        `Beide Parteien verpflichten sich, alle im Rahmen dieses Vertrages erhaltenen vertraulichen ` +
        `Informationen streng vertraulich zu behandeln und nicht an Dritte weiterzugeben. Diese Pflicht ` +
        `besteht auch nach Beendigung des Vertrages fort.`,
        { lineGap: 3.5 }
      );

    doc.moveDown(1);

    // ── § 7 Schlussbestimmungen ──
    sectionHeading(doc, '§ 7  Schlussbestimmungen', navy, cyan, mLeft, pageW);
    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica').fillColor(bodyText)
      .text(
        `Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz des Auftragnehmers. ` +
        `Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollten einzelne ` +
        `Bestimmungen dieses Vertrages unwirksam sein oder werden, so wird hierdurch die Gültigkeit ` +
        `der übrigen Bestimmungen nicht berührt.`,
        { lineGap: 3.5 }
      );

    // ── Signature block ──
    // Check if enough space, otherwise new page
    if (doc.y > doc.page.height - 160) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, 6).fill(navy);
      doc.rect(0, 6, doc.page.width, 2).fill(cyan);
      doc.y = 50;
    }

    doc.moveDown(2);

    doc.moveTo(mLeft, doc.y).lineTo(doc.page.width - mRight, doc.y)
      .strokeColor(borderColor).lineWidth(0.5).stroke();

    doc.moveDown(1.5);

    const sigColW = (pageW - 40) / 2;
    const sigY = doc.y;

    // Left — Auftraggeber
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(grayText)
      .text('AUFTRAGGEBER', mLeft, sigY, { width: sigColW });
    doc.moveDown(2.5);
    doc.moveTo(mLeft, doc.y).lineTo(mLeft + sigColW, doc.y)
      .strokeColor(borderColor).lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    doc.fontSize(8).font('Helvetica').fillColor(lightGray)
      .text('Ort, Datum, Unterschrift', mLeft, doc.y, { width: sigColW });

    // Right — Auftragnehmer
    const sigRightX = mLeft + sigColW + 40;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(grayText)
      .text('AUFTRAGNEHMER', sigRightX, sigY, { width: sigColW });
    doc.y = sigY;
    doc.moveDown(2.5);
    doc.moveTo(sigRightX, doc.y).lineTo(sigRightX + sigColW, doc.y)
      .strokeColor(borderColor).lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    doc.fontSize(8).font('Helvetica').fillColor(lightGray)
      .text('Ort, Datum, Unterschrift', sigRightX, doc.y, { width: sigColW });

    // ── Footer band ──
    const footerY = doc.page.height - 30;
    doc.fontSize(7).font('Helvetica').fillColor(lightGray)
      .text('Novaris Consulting GmbH  ·  Beratung für Forschungszulagen  ·  novaris-consulting.com',
        mLeft, footerY, { width: pageW, align: 'center' });
    doc.rect(0, doc.page.height - 6, doc.page.width, 2).fill(cyan);
    doc.rect(0, doc.page.height - 4, doc.page.width, 4).fill(navy);

    doc.end();

    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}

function sectionHeading(doc, text, navyColor, cyanColor, mLeft, pageW) {
  doc.fontSize(11.5).font('Helvetica-Bold').fillColor(navyColor).text(text);
  const y = doc.y + 3;
  doc.moveTo(mLeft, y).lineTo(mLeft + 40, y).strokeColor(cyanColor).lineWidth(2).stroke();
  doc.moveTo(mLeft + 44, y).lineTo(mLeft + pageW, y).strokeColor('#dde5f4').lineWidth(0.5).stroke();
  doc.y = y + 4;
}

module.exports = { generateContractPdf };
