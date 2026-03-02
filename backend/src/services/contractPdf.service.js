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
 * Returns the relative file path (from uploads root).
 */
async function generateContractPdf(contract) {
  ensureDir();

  // Extract sequential number from contractNumber (e.g. NV-2026-0001 → 0001)
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
      margins: { top: 70, bottom: 70, left: 65, right: 65 },
      info: {
        Title: `Dienstleistungsvertrag ${contract.contractNumber}`,
        Author: 'Novaris Consulting GmbH',
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const brandColor = '#0D7377';
    const darkText = '#1a1a1a';
    const grayText = '#555555';
    const lineColor = '#d1d5db';
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Header bar ──
    doc.rect(0, 0, doc.page.width, 8).fill(brandColor);

    // ── Company header ──
    doc.moveDown(1);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(brandColor)
      .text('NOVARIS CONSULTING GmbH', { align: 'left' });
    doc.fontSize(9).font('Helvetica').fillColor(grayText)
      .text('Beratung für Forschungszulagen nach dem Forschungszulagengesetz (FZulG)', { align: 'left' });

    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(lineColor).lineWidth(1).stroke();

    // ── Title ──
    doc.moveDown(1.5);
    doc.fontSize(16).font('Helvetica-Bold').fillColor(darkText)
      .text('Dienstleistungsvertrag', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor(grayText)
      .text(`Vertragsnummer: ${contract.contractNumber}`, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor(grayText)
      .text(`Datum: ${formatDate(contract.createdAt)}`, { align: 'center' });

    doc.moveDown(1.5);

    // ── Parties ──
    sectionHeading(doc, '§ 1 Vertragsparteien', brandColor);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
      .text('Auftraggeber:', { continued: false });
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text(companyName);
    doc.text(fullAddress);

    doc.moveDown(0.8);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(darkText)
      .text('Auftragnehmer:', { continued: false });
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text('Novaris Consulting GmbH');
    doc.text('Beratung für Forschungszulagen');

    doc.moveDown(1.2);

    // ── Subject ──
    sectionHeading(doc, '§ 2 Vertragsgegenstand', brandColor);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text(
        `Gegenstand dieses Vertrages ist die Beratung und Unterstützung des Auftraggebers bei der Beantragung ` +
        `der Forschungszulage gemäß dem Forschungszulagengesetz (FZulG). Der Auftragnehmer unterstützt den ` +
        `Auftraggeber bei der Identifizierung förderfähiger Forschungs- und Entwicklungsvorhaben, der Erstellung ` +
        `der erforderlichen Antragsunterlagen sowie der Kommunikation mit der Bescheinigungsstelle Forschungszulage (BSFZ) ` +
        `und dem zuständigen Finanzamt.`,
        { lineGap: 3 }
      );

    doc.moveDown(1.2);

    // ── Duration ──
    sectionHeading(doc, '§ 3 Vertragslaufzeit', brandColor);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text(
        `Die Vertragslaufzeit beträgt ${durationYears} ab dem Datum der Unterzeichnung dieses Vertrages. ` +
        `Der Vertrag verlängert sich automatisch um jeweils ein weiteres Jahr, sofern er nicht mit einer Frist ` +
        `von drei Monaten zum Ende der jeweiligen Vertragslaufzeit schriftlich gekündigt wird.`,
        { lineGap: 3 }
      );

    doc.moveDown(1.2);

    // ── Compensation ──
    sectionHeading(doc, '§ 4 Vergütung', brandColor);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text(
        `Die Vergütung des Auftragnehmers beträgt ${contract.commissionRate.toFixed(1)}% der beantragten Förderkosten ` +
        `(Beantragte Förderkosten). Die Vergütung wird nach erfolgreicher Einreichung des Antrags bei der BSFZ fällig. ` +
        `Die Zahlung ist innerhalb von 14 Tagen nach Rechnungsstellung zu leisten.`,
        { lineGap: 3 }
      );
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text(
        `Sollte der Antrag auf Forschungszulage ganz oder teilweise abgelehnt werden, wird die Vergütung ` +
        `anteilig auf den tatsächlich bewilligten Betrag angepasst.`,
        { lineGap: 3 }
      );

    doc.moveDown(1.2);

    // ── Obligations ──
    sectionHeading(doc, '§ 5 Pflichten des Auftraggebers', brandColor);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text('Der Auftraggeber verpflichtet sich:', { lineGap: 3 });
    const obligations = [
      'Alle erforderlichen Unterlagen und Informationen rechtzeitig und vollständig zur Verfügung zu stellen.',
      'Änderungen an laufenden Forschungs- und Entwicklungsvorhaben unverzüglich mitzuteilen.',
      'Die im Rahmen der Beratung erstellten Unterlagen vor Einreichung zu prüfen und freizugeben.',
    ];
    obligations.forEach((item) => {
      doc.fontSize(10).font('Helvetica').fillColor(darkText)
        .text(`    •  ${item}`, { lineGap: 3 });
    });

    doc.moveDown(1.2);

    // ── Confidentiality ──
    sectionHeading(doc, '§ 6 Vertraulichkeit', brandColor);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text(
        `Beide Parteien verpflichten sich, alle im Rahmen dieses Vertrages erhaltenen vertraulichen Informationen ` +
        `streng vertraulich zu behandeln und nicht an Dritte weiterzugeben. Diese Pflicht besteht auch nach ` +
        `Beendigung des Vertrages fort.`,
        { lineGap: 3 }
      );

    doc.moveDown(1.2);

    // ── Governing law ──
    sectionHeading(doc, '§ 7 Schlussbestimmungen', brandColor);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor(darkText)
      .text(
        `Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz des Auftragnehmers. ` +
        `Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Sollten einzelne Bestimmungen ` +
        `dieses Vertrages unwirksam sein oder werden, so wird hierdurch die Gültigkeit der übrigen Bestimmungen ` +
        `nicht berührt.`,
        { lineGap: 3 }
      );

    doc.moveDown(2);

    // ── Signature block ──
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(lineColor).lineWidth(0.5).stroke();

    doc.moveDown(1.5);

    const colWidth = pageWidth / 2 - 20;
    const sigY = doc.y;

    // Left — Auftraggeber
    doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText)
      .text('Auftraggeber:', doc.page.margins.left, sigY, { width: colWidth });
    doc.moveDown(2.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + colWidth, doc.y)
      .strokeColor(lineColor).lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').fillColor(grayText)
      .text('Ort, Datum, Unterschrift', doc.page.margins.left, doc.y, { width: colWidth });

    // Right — Auftragnehmer
    const rightX = doc.page.margins.left + colWidth + 40;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText)
      .text('Auftragnehmer:', rightX, sigY, { width: colWidth });
    doc.y = sigY;
    doc.moveDown(2.5);
    doc.moveTo(rightX, doc.y)
      .lineTo(rightX + colWidth, doc.y)
      .strokeColor(lineColor).lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica').fillColor(grayText)
      .text('Ort, Datum, Unterschrift', rightX, doc.y, { width: colWidth });

    // ── Footer bar ──
    doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(brandColor);

    doc.end();

    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}

function sectionHeading(doc, text, color) {
  doc.fontSize(12).font('Helvetica-Bold').fillColor(color).text(text);
  const y = doc.y + 2;
  doc.moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.margins.left + 160, y)
    .strokeColor(color).lineWidth(1.5).stroke();
  doc.y = y + 2;
}

module.exports = { generateContractPdf };
