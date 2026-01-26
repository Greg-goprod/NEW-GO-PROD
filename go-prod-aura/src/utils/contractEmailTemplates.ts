import type { Contract } from '../types/contracts';

interface EmailTemplateData {
  contract: Contract;
  eventName?: string;
  customMessage?: string;
  signatureUrl: string;
}

/**
 * Template email moderne pour signature interne
 */
export const generateModernContractEmail = ({
  contract,
  eventName,
  customMessage,
  signatureUrl
}: EmailTemplateData): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signature de contrat</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                📄 Contrat à signer
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Bonjour,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Un nouveau contrat nécessite votre signature :
              </p>
              
              <!-- Contract Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Détails du contrat
                    </p>
                    <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                      ${contract.contract_title}
                    </h2>
                    ${eventName ? `
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 15px;">
                      <strong>Événement :</strong> ${eventName}
                    </p>
                    ` : ''}
                    <p style="margin: 0; color: #6b7280; font-size: 15px;">
                      <strong>Artiste :</strong> ${contract.artist_name || 'Non spécifié'}
                    </p>
                  </td>
                </tr>
              </table>
              
              ${customMessage ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.5;">
                  <strong>Message :</strong><br>
                  ${customMessage}
                </p>
              </div>
              ` : ''}
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${signatureUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                      ✍️ Signer le contrat
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Ce lien est sécurisé et expirera dans <strong>7 jours</strong>.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                Cet email a été généré automatiquement par Go-Prod AURA
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

interface ExternalSignatureEmailTemplateProps {
  artistName: string;
  eventName?: string;
  returnEmail: string;
}

/**
 * Template email pour signature externe (avec PDF en pièce jointe)
 */
export const generateExternalSignatureEmailTemplate = ({
  artistName,
  eventName,
  returnEmail
}: ExternalSignatureEmailTemplateProps): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat à signer</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎵 Contrat artiste
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Bonjour,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Veuillez trouver ci-joint le contrat concernant <strong>${artistName}</strong>${eventName ? ` pour l'événement <strong>${eventName}</strong>` : ''}.
              </p>
              
              <!-- Instructions Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      📋 Instructions
                    </p>
                    <ol style="margin: 0; padding-left: 20px; color: #92400e; font-size: 15px; line-height: 1.8;">
                      <li>Téléchargez le PDF ci-joint</li>
                      <li>Lisez attentivement le contrat</li>
                      <li>Signez le document</li>
                      <li>Renvoyez-le par email à : <strong>${returnEmail}</strong></li>
                    </ol>
                  </td>
                </tr>
              </table>
              
              <!-- Important Note -->
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 24px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                  <strong>⚡ Important :</strong> Merci de nous retourner le contrat signé dans les plus brefs délais.
                </p>
              </div>
              
              <p style="margin: 32px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Pour toute question, n'hésitez pas à nous contacter à : <a href="mailto:${returnEmail}" style="color: #3b82f6; text-decoration: none;">${returnEmail}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                Cet email a été généré automatiquement par Go-Prod AURA
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
