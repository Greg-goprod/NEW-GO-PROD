/**
 * Modal de détails d'un contact avec impression
 */

import { Modal } from '@/components/aura/Modal';
import { Button } from '@/components/aura/Button';
import { Building2, Mail, Phone, User, Printer, X, Music, Moon, FileText, PenTool, Briefcase } from 'lucide-react';
import { formatPhoneNumber, getWhatsAppLink } from '@/utils/phoneUtils';
import type { CRMContactWithRelations } from '@/types/crm';

interface ContactDetailsModalProps {
  contact: CRMContactWithRelations | null;
  open: boolean;
  onClose: () => void;
}

export function ContactDetailsModal({ contact, open, onClose }: ContactDetailsModalProps) {
  if (!contact) return null;

  const whatsappLink = getWhatsAppLink(contact.phone_mobile);

  const handlePrint = () => {
    window.print();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <>
      {/* Modal pour affichage écran */}
      <Modal
        open={open}
        onClose={onClose}
        title="Détails du contact"
        size="md"
      >
        <div className="space-y-6">
          {/* En-tête avec photo et nom */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            {contact.photo_url ? (
              <img
                src={contact.photo_url}
                alt={`${contact.first_name} ${contact.last_name}`}
                className="w-28 h-28 rounded-full object-cover border-2 border-violet-500"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-3xl border-2 border-violet-500">
                {getInitials(contact.first_name, contact.last_name)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {contact.first_name} {contact.last_name}
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  contact.is_internal 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {contact.is_internal ? 'Interne' : 'Externe'}
                </span>
              </div>
              {contact.department && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                  <Briefcase className="w-4 h-4" />
                  <span>{contact.department.label}</span>
                </div>
              )}
              {contact.main_company && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{contact.main_company.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Badges d'options */}
          {(contact.is_night_contact || contact.is_primary_for_company_billing || contact.is_signatory) && (
            <div className="flex flex-wrap gap-2">
              {contact.is_night_contact && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  <Moon className="w-3.5 h-3.5" />
                  Contact de nuit
                </span>
              )}
              {contact.is_primary_for_company_billing && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <FileText className="w-3.5 h-3.5" />
                  Contact facturation
                </span>
              )}
              {contact.is_signatory && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <PenTool className="w-3.5 h-3.5" />
                  Signataire
                </span>
              )}
            </div>
          )}

          {/* Informations principales */}
          <div className="grid grid-cols-2 gap-4">
            {/* Fonction(s) */}
            {contact.roles && contact.roles.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-violet-500" />
                  Fonction(s)
                </label>
                <div className="flex flex-wrap gap-1">
                  {contact.roles.map((role) => (
                    <span
                      key={role.id}
                      className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
                    >
                      {role.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Entreprises liées */}
            {contact.linked_companies && contact.linked_companies.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Entreprises
                </label>
                <div className="flex flex-wrap gap-1">
                  {contact.main_company && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {contact.main_company.company_name}
                    </span>
                  )}
                  {contact.linked_companies.map((company) => (
                    <span
                      key={company.id}
                      className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {company.company_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Coordonnées
            </h3>
            
            {/* Téléphone */}
            {contact.phone_mobile && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
                  >
                    {formatPhoneNumber(contact.phone_mobile)}
                  </a>
                ) : (
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {formatPhoneNumber(contact.phone_mobile)}
                  </span>
                )}
              </div>
            )}

            {/* Email */}
            {contact.email_primary && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <a
                  href={`mailto:${contact.email_primary}`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  {contact.email_primary}
                </a>
              </div>
            )}

            {/* LinkedIn */}
            {contact.linkedin_url && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors truncate"
                >
                  Profil LinkedIn
                </a>
              </div>
            )}
          </div>

          {/* Artistes associés */}
          {contact.artists && contact.artists.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Music className="w-4 h-4 text-violet-500" />
                Artistes associés
              </h3>
              <div className="flex flex-wrap gap-2">
                {contact.artists.map((artist) => (
                  <span
                    key={artist.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-violet-100 to-purple-100 text-violet-900 dark:from-violet-900 dark:to-purple-900 dark:text-violet-100 border border-violet-200 dark:border-violet-800"
                  >
                    {artist.artist_name}
                    {artist.artist_real_name && artist.artist_real_name !== artist.artist_name && (
                      <span className="text-xs text-violet-600 dark:text-violet-300 ml-1">({artist.artist_real_name})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes internes */}
          {contact.notes_internal && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                Notes internes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {contact.notes_internal}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button variant="ghost" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Version imprimable (cachée à l'écran) */}
      <div className="hidden print:block print:p-8">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-content, .print-content * {
                visibility: visible;
              }
              .print-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              @page {
                margin: 2cm;
                size: A4;
              }
              .page-break {
                page-break-before: always;
              }
            }
          `}
        </style>
        <div className="print-content">
          {/* En-tête */}
          <div className="mb-8 pb-4 border-b-2 border-gray-300">
            <div className="flex items-center gap-6">
              {contact.photo_url ? (
                <img
                  src={contact.photo_url}
                  alt={`${contact.first_name} ${contact.last_name}`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-violet-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-3xl border-2 border-violet-500">
                  {getInitials(contact.first_name, contact.last_name)}
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {contact.first_name} {contact.last_name}
                </h1>
                {contact.main_company && (
                  <p className="text-xl text-gray-600">
                    {contact.main_company.company_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Fonctions */}
          {contact.roles && contact.roles.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">Fonction(s)</h2>
              <div className="flex flex-wrap gap-2">
                {contact.roles.map((role) => (
                  <span key={role.id} className="px-3 py-1 bg-violet-100 text-violet-900 rounded font-medium">
                    {role.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Coordonnées personnelles */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">Coordonnées personnelles</h2>
            <div className="space-y-2 ml-4">
              {contact.phone_mobile && (
                <p className="text-base">
                  <strong>Téléphone :</strong> {formatPhoneNumber(contact.phone_mobile)}
                </p>
              )}
              {contact.email_primary && (
                <p className="text-base">
                  <strong>Email :</strong> {contact.email_primary}
                </p>
              )}
              {contact.linkedin_url && (
                <p className="text-base">
                  <strong>LinkedIn :</strong> {contact.linkedin_url}
                </p>
              )}
            </div>
          </div>

          {/* Entreprise principale - Informations complètes */}
          {contact.main_company && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">Entreprise principale</h2>
              <div className="ml-4 space-y-4">
                <h3 className="text-base font-bold text-gray-900">{contact.main_company.company_name}</h3>
                
                {/* Coordonnées entreprise */}
                <div className="space-y-1">
                  {contact.main_company.main_phone && (
                    <p className="text-sm">
                      <strong>Téléphone :</strong> {formatPhoneNumber(contact.main_company.main_phone)}
                    </p>
                  )}
                  {contact.main_company.main_email && (
                    <p className="text-sm">
                      <strong>Email :</strong> {contact.main_company.main_email}
                    </p>
                  )}
                  {contact.main_company.website_url && (
                    <p className="text-sm">
                      <strong>Site web :</strong> {contact.main_company.website_url}
                    </p>
                  )}
                </div>

                {/* Adresse */}
                {(contact.main_company.address_line1 || contact.main_company.city) && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Adresse :</p>
                    <div className="text-sm ml-2">
                      {contact.main_company.address_line1 && <p>{contact.main_company.address_line1}</p>}
                      {contact.main_company.address_line2 && <p>{contact.main_company.address_line2}</p>}
                      {(contact.main_company.zip_code || contact.main_company.city) && (
                        <p>
                          {contact.main_company.zip_code} {contact.main_company.city}
                        </p>
                      )}
                      {contact.main_company.country && <p>{contact.main_company.country}</p>}
                    </div>
                  </div>
                )}

                {/* Informations bancaires et fiscales */}
                {(contact.main_company.iban || contact.main_company.swift_bic || contact.main_company.tax_id) && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Informations bancaires & fiscales :</p>
                    <div className="text-sm ml-2 space-y-1">
                      {contact.main_company.iban && (
                        <p><strong>IBAN :</strong> {contact.main_company.iban}</p>
                      )}
                      {contact.main_company.swift_bic && (
                        <p><strong>SWIFT/BIC :</strong> {contact.main_company.swift_bic}</p>
                      )}
                      {contact.main_company.finance_email && (
                        <p><strong>Email finance :</strong> {contact.main_company.finance_email}</p>
                      )}
                      {contact.main_company.tax_id && (
                        <p><strong>N° TVA :</strong> {contact.main_company.tax_id}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Autres entreprises liées - Informations complètes */}
          {contact.linked_companies && contact.linked_companies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">Autres entreprises liées</h2>
              <div className="space-y-6">
                {contact.linked_companies.map((company) => (
                  <div key={company.id} className="ml-4 space-y-2 pb-4 border-b border-gray-200 last:border-0">
                    <h3 className="text-base font-bold text-gray-900">{company.company_name}</h3>
                    
                    {/* Coordonnées */}
                    {(company.main_phone || company.main_email || company.website_url) && (
                      <div className="space-y-1">
                        {company.main_phone && (
                          <p className="text-sm">
                            <strong>Téléphone :</strong> {formatPhoneNumber(company.main_phone)}
                          </p>
                        )}
                        {company.main_email && (
                          <p className="text-sm">
                            <strong>Email :</strong> {company.main_email}
                          </p>
                        )}
                        {company.website_url && (
                          <p className="text-sm">
                            <strong>Site web :</strong> {company.website_url}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Adresse */}
                    {(company.address_line1 || company.city) && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Adresse :</p>
                        <div className="text-sm ml-2">
                          {company.address_line1 && <p>{company.address_line1}</p>}
                          {company.address_line2 && <p>{company.address_line2}</p>}
                          {(company.zip_code || company.city) && (
                            <p>
                              {company.zip_code} {company.city}
                            </p>
                          )}
                          {company.country && <p>{company.country}</p>}
                        </div>
                      </div>
                    )}

                    {/* Informations bancaires et fiscales */}
                    {(company.iban || company.swift_bic || company.tax_id) && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Informations bancaires & fiscales :</p>
                        <div className="text-sm ml-2 space-y-1">
                          {company.iban && (
                            <p><strong>IBAN :</strong> {company.iban}</p>
                          )}
                          {company.swift_bic && (
                            <p><strong>SWIFT/BIC :</strong> {company.swift_bic}</p>
                          )}
                          {company.finance_email && (
                            <p><strong>Email finance :</strong> {company.finance_email}</p>
                          )}
                          {company.tax_id && (
                            <p><strong>N° TVA :</strong> {company.tax_id}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artistes associés */}
          {contact.artists && contact.artists.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">Artistes associés</h2>
              <div className="flex flex-wrap gap-2 ml-4">
                {contact.artists.map((artist) => (
                  <span key={artist.id} className="px-3 py-1 bg-violet-50 text-violet-900 rounded border border-violet-200 font-medium">
                    {artist.artist_name}
                    {artist.artist_real_name && artist.artist_real_name !== artist.artist_name && (
                      <span className="text-xs text-gray-600 ml-1">({artist.artist_real_name})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes internes */}
          {contact.notes_internal && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">Notes internes</h2>
              <p className="text-base text-gray-700 whitespace-pre-wrap ml-4">
                {contact.notes_internal}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-4 border-t-2 border-gray-300 text-sm text-gray-500">
            <p className="font-medium">Document imprimé le {new Date().toLocaleDateString('fr-FR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p className="text-xs mt-1 text-gray-400">Fiche contact CRM - Go-Prod AURA</p>
          </div>
        </div>
      </div>
    </>
  );
}

