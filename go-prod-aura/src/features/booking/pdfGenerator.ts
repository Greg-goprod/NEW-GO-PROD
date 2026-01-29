import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Offer } from './bookingTypes';
import type { OfferClause, OfferPayment } from './advancedBookingApi';

interface ContractPDFOptions {
  offer: Offer;
  clauses?: OfferClause[];
  payments?: OfferPayment[];
  companyInfo?: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    logo?: string;
  };
}

/**
 * Génère un PDF de contrat avec les clauses personnalisées
 */
export async function generateContractPdfWithClauses(
  options: ContractPDFOptions
): Promise<Uint8Array> {
  const { offer, clauses = [], payments = [], companyInfo } = options;
  
  // Créer un nouveau document PDF
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4 en points (210mm x 297mm)
  
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  const leftMargin = 50;
  const rightMargin = width - 50;
  const lineHeight = 15;
  const sectionSpacing = 25;
  
  // Fonction helper pour ajouter du texte
  const addText = (
    text: string,
    x: number,
    y: number,
    options: { font?: any; size?: number; color?: any; maxWidth?: number } = {}
  ) => {
    const { font: textFont = font, size = 11, color = rgb(0, 0, 0), maxWidth } = options;
    
    if (maxWidth) {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      
      words.forEach((word) => {
        const testLine = line + word + ' ';
        const testWidth = textFont.widthOfTextAtSize(testLine, size);
        
        if (testWidth > maxWidth && line !== '') {
          page.drawText(line.trim(), {
            x,
            y: currentY,
            size,
            font: textFont,
            color,
          });
          line = word + ' ';
          currentY -= lineHeight;
          
          // Nouvelle page si nécessaire
          if (currentY < 50) {
            page = pdfDoc.addPage([595, 842]);
            currentY = height - 50;
          }
        } else {
          line = testLine;
        }
      });
      
      if (line.trim()) {
        page.drawText(line.trim(), {
          x,
          y: currentY,
          size,
          font: textFont,
          color,
        });
      }
      
      return currentY;
    }
    
    page.drawText(text, {
      x,
      y,
      size,
      font: textFont,
      color,
    });
    
    return y;
  };
  
  const checkNewPage = () => {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }
  };
  
  // EN-TÊTE
  addText('CONTRAT DE PRESTATION ARTISTIQUE', leftMargin, yPosition, {
    font: boldFont,
    size: 18,
    color: rgb(0.35, 0.23, 0.7), // Violet
  });
  yPosition -= sectionSpacing;
  
  // Informations entreprise
  if (companyInfo) {
    addText(companyInfo.name, leftMargin, yPosition, { font: boldFont, size: 12 });
    yPosition -= lineHeight;
    if (companyInfo.address) {
      addText(companyInfo.address, leftMargin, yPosition, { size: 10 });
      yPosition -= lineHeight;
    }
    if (companyInfo.email) {
      addText(`Email: ${companyInfo.email}`, leftMargin, yPosition, { size: 10 });
      yPosition -= lineHeight;
    }
    if (companyInfo.phone) {
      addText(`Tél: ${companyInfo.phone}`, leftMargin, yPosition, { size: 10 });
      yPosition -= lineHeight;
    }
    yPosition -= sectionSpacing;
  }
  
  checkNewPage();
  
  // INFORMATIONS SUR L'OFFRE
  addText('1. INFORMATIONS SUR LA PRESTATION', leftMargin, yPosition, {
    font: boldFont,
    size: 14,
  });
  yPosition -= lineHeight + 5;
  
  addText(`Artiste: ${offer.artist_name || 'N/A'}`, leftMargin + 10, yPosition);
  yPosition -= lineHeight;
  
  if (offer.stage_name) {
    addText(`Scène: ${offer.stage_name}`, leftMargin + 10, yPosition);
    yPosition -= lineHeight;
  }
  
  if (offer.date_time) {
    const formattedDate = new Date(offer.date_time).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    addText(`Date: ${formattedDate}`, leftMargin + 10, yPosition);
    yPosition -= lineHeight;
  }
  
  if (offer.performance_time) {
    addText(`Heure: ${offer.performance_time}`, leftMargin + 10, yPosition);
    yPosition -= lineHeight;
  }
  
  if (offer.duration) {
    addText(`Durée: ${offer.duration} minutes`, leftMargin + 10, yPosition);
    yPosition -= lineHeight;
  }
  
  yPosition -= sectionSpacing;
  checkNewPage();
  
  // RÉMUNÉRATION
  addText('2. RÉMUNÉRATION', leftMargin, yPosition, {
    font: boldFont,
    size: 14,
  });
  yPosition -= lineHeight + 5;
  
  if (offer.amount_display && offer.currency) {
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: offer.currency,
    }).format(offer.amount_display);
    
    addText(`Montant total: ${formattedAmount}`, leftMargin + 10, yPosition, {
      font: boldFont,
      size: 12,
    });
    yPosition -= lineHeight;
  }
  
  if (offer.agency_commission_pct) {
    addText(`Commission: ${offer.agency_commission_pct}%`, leftMargin + 10, yPosition);
    yPosition -= lineHeight;
  }
  
  yPosition -= sectionSpacing;
  checkNewPage();
  
  // ÉCHÉANCIER DE PAIEMENT
  if (payments.length > 0) {
    addText('3. ÉCHÉANCIER DE PAIEMENT', leftMargin, yPosition, {
      font: boldFont,
      size: 14,
    });
    yPosition -= lineHeight + 5;
    
    payments.forEach((payment, index) => {
      checkNewPage();
      
      addText(`${index + 1}. ${payment.label}`, leftMargin + 10, yPosition, { font: boldFont });
      yPosition -= lineHeight;
      
      if (payment.amount) {
        const formattedAmount = new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: offer.currency || 'EUR',
        }).format(payment.amount);
        addText(`   Montant: ${formattedAmount}`, leftMargin + 15, yPosition);
        yPosition -= lineHeight;
      }
      
      if (payment.percentage) {
        addText(`   Pourcentage: ${payment.percentage}%`, leftMargin + 15, yPosition);
        yPosition -= lineHeight;
      }
      
      if (payment.due_date) {
        const formattedDate = new Date(payment.due_date).toLocaleDateString('fr-FR');
        addText(`   Échéance: ${formattedDate}`, leftMargin + 15, yPosition);
        yPosition -= lineHeight;
      }
      
      yPosition -= 5;
    });
    
    yPosition -= sectionSpacing;
  }
  
  // CLAUSES PERSONNALISÉES
  if (clauses.length > 0) {
    checkNewPage();
    
    addText('4. CLAUSES CONTRACTUELLES', leftMargin, yPosition, {
      font: boldFont,
      size: 14,
    });
    yPosition -= lineHeight + 5;
    
    clauses.forEach((clause, index) => {
      checkNewPage();
      
      // Titre de la clause
      addText(`${index + 1}. ${clause.title}`, leftMargin + 10, yPosition, {
        font: boldFont,
        size: 12,
      });
      yPosition -= lineHeight;
      
      // Corps de la clause (multiligne avec retour à la ligne automatique)
      const lines = clause.body.split('\n');
      lines.forEach((line) => {
        checkNewPage();
        
        // Gérer les lignes longues
        const words = line.split(' ');
        let currentLine = '';
        
        words.forEach((word) => {
          const testLine = currentLine + word + ' ';
          const testWidth = font.widthOfTextAtSize(testLine, 10);
          
          if (testWidth > rightMargin - leftMargin - 20) {
            if (currentLine) {
              addText(currentLine.trim(), leftMargin + 15, yPosition, { size: 10 });
              yPosition -= lineHeight;
              checkNewPage();
            }
            currentLine = word + ' ';
          } else {
            currentLine = testLine;
          }
        });
        
        if (currentLine) {
          addText(currentLine.trim(), leftMargin + 15, yPosition, { size: 10 });
          yPosition -= lineHeight;
        }
      });
      
      yPosition -= 10;
    });
    
    yPosition -= sectionSpacing;
  }
  
  // SIGNATURES
  checkNewPage();
  yPosition -= sectionSpacing;
  
  addText('5. SIGNATURES', leftMargin, yPosition, {
    font: boldFont,
    size: 14,
  });
  yPosition -= lineHeight + 10;
  
  // Zone de signature organisateur
  addText('Pour l\'organisateur:', leftMargin + 10, yPosition);
  yPosition -= lineHeight * 4;
  addText('Date: ___________________', leftMargin + 10, yPosition);
  yPosition -= lineHeight;
  addText('Signature:', leftMargin + 10, yPosition);
  
  // Zone de signature artiste (à droite)
  yPosition += lineHeight * 5;
  addText('Pour l\'artiste:', rightMargin - 200, yPosition);
  yPosition -= lineHeight * 4;
  addText('Date: ___________________', rightMargin - 200, yPosition);
  yPosition -= lineHeight;
  addText('Signature:', rightMargin - 200, yPosition);
  
  // Pied de page sur toutes les pages
  const pages = pdfDoc.getPages();
  pages.forEach((p, index) => {
    p.drawText(`Page ${index + 1} / ${pages.length}`, {
      x: width / 2 - 30,
      y: 30,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  });
  
  // Sauvegarder et retourner le PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Télécharge un PDF généré
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}


