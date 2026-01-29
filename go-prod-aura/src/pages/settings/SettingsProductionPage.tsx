import { useState } from 'react';
import { Truck, Coffee, ChevronDown, Phone, MessageSquare, Mail, Hotel, FileText, Clock, Plane, Users, Wrench, Calendar, PartyPopper } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/aura/Card';
import { Button } from '@/components/aura/Button';
import { Input } from '@/components/aura/Input';
import { useToast } from '@/components/aura/ToastProvider';
import { TimePickerPopup } from '@/components/ui/pickers/TimePickerPopup';

export function SettingsProductionPage() {
  const { success: toastSuccess } = useToast();

  // Accordeons
  const [accordionGroundOpen, setAccordionGroundOpen] = useState(false);
  const [accordionHospitalityOpen, setAccordionHospitalityOpen] = useState(false);
  const [accordionTouringPartyOpen, setAccordionTouringPartyOpen] = useState(false);
  const [accordionTravelOpen, setAccordionTravelOpen] = useState(false);
  const [accordionTechniqueOpen, setAccordionTechniqueOpen] = useState(false);
  const [accordionTimetableOpen, setAccordionTimetableOpen] = useState(false);
  const [accordionPartyCrewOpen, setAccordionPartyCrewOpen] = useState(false);

  // Ground data
  const [groundData, setGroundData] = useState({
    defaultTransportHours: '2',
    emergencyNumber: '',
    smsTemplate: 'Bonjour {name}, votre transport est prevu a {time}.',
    emailTemplate: 'Transport confirme pour {name} a {time}.',
  });

  // Hospitality data
  const [hospitalityData, setHospitalityData] = useState({
    hotelPolicy: 'standard',
    buyoutPolicy: 'negotiable',
    roomingListFormat: 'excel',
    defaultCheckIn: '15:00',
    defaultCheckOut: '11:00',
  });

  const handleSaveGround = () => {
    localStorage.setItem('ground_settings', JSON.stringify(groundData));
    toastSuccess('Parametres Ground sauvegardes');
  };

  const handleSaveHospitality = () => {
    localStorage.setItem('hospitality_settings', JSON.stringify(hospitalityData));
    toastSuccess('Parametres Hospitality sauvegardes');
  };

  return (
    <div className="space-y-6">
      {/* En-tete */}
      <div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Options Production
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gerez les parametres logistique et hospitality
        </p>
      </div>

      {/* ACCORDEON 1: GROUND */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header accordeon */}
        <button
          type="button"
          onClick={() => setAccordionGroundOpen(!accordionGroundOpen)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ background: accordionGroundOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Truck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                GROUND
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Transport, communications et logistique terrain
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-200 ${accordionGroundOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>

        {/* Contenu accordeon */}
        {accordionGroundOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
              {/* Transport */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Transport</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <Input
                    label="Heures par defaut"
                    type="number"
                    value={groundData.defaultTransportHours}
                    onChange={(e) => setGroundData(prev => ({ ...prev, defaultTransportHours: e.target.value }))}
                    placeholder="2"
                  />
                </CardBody>
              </Card>

              {/* Urgence */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Urgence</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <Input
                    label="Numero"
                    type="tel"
                    value={groundData.emergencyNumber}
                    onChange={(e) => setGroundData(prev => ({ ...prev, emergencyNumber: e.target.value }))}
                    placeholder="+33 6 12 34 56 78"
                  />
                </CardBody>
              </Card>

              {/* SMS Template */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>SMS</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <textarea
                    value={groundData.smsTemplate}
                    onChange={(e) => setGroundData(prev => ({ ...prev, smsTemplate: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    rows={4}
                    placeholder="Bonjour {name}, votre transport est prevu a {time}."
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Variables: {'{name}'}, {'{time}'}, {'{location}'}
                  </p>
                </CardBody>
              </Card>

              {/* Email Template */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <textarea
                    value={groundData.emailTemplate}
                    onChange={(e) => setGroundData(prev => ({ ...prev, emailTemplate: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    rows={4}
                    placeholder="Transport confirme pour {name} a {time}."
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Variables: {'{name}'}, {'{time}'}, {'{location}'}, {'{driver}'}
                  </p>
                </CardBody>
              </Card>

              {/* Bouton Sauvegarder */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                <Button variant="primary" size="sm" onClick={handleSaveGround}>
                  Enregistrer Ground
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDEON 2: HOSPITALITY */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header accordeon */}
        <button
          type="button"
          onClick={() => setAccordionHospitalityOpen(!accordionHospitalityOpen)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ background: accordionHospitalityOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Coffee className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                HOSPITALITY
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Hotels, buyout et hebergement
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-200 ${accordionHospitalityOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>

        {/* Contenu accordeon */}
        {accordionHospitalityOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
              {/* Hotels */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Hotel className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Hotels</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Politique
                  </label>
                  <select
                    value={hospitalityData.hotelPolicy}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, hotelPolicy: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    <option value="standard">Standard</option>
                    <option value="luxury">Luxe</option>
                    <option value="budget">Budget</option>
                    <option value="mixed">Mixte</option>
                  </select>
                </CardBody>
              </Card>

              {/* Buyout */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Buyout</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Politique
                  </label>
                  <select
                    value={hospitalityData.buyoutPolicy}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, buyoutPolicy: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    <option value="negotiable">Negociable</option>
                    <option value="fixed">Fixe</option>
                    <option value="per_diem">Par jour</option>
                    <option value="none">Aucun</option>
                  </select>
                </CardBody>
              </Card>

              {/* Rooming List Format */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Rooming</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Format export
                  </label>
                  <select
                    value={hospitalityData.roomingListFormat}
                    onChange={(e) => setHospitalityData(prev => ({ ...prev, roomingListFormat: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                    <option value="json">JSON</option>
                  </select>
                </CardBody>
              </Card>

              {/* Check-in */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Check-in</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <TimePickerPopup
                    label="Heure par defaut"
                    value={hospitalityData.defaultCheckIn || null}
                    onChange={(time) => setHospitalityData(prev => ({ ...prev, defaultCheckIn: time || '' }))}
                  />
                </CardBody>
              </Card>

              {/* Check-out */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-violet-400" />
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Check-out</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <TimePickerPopup
                    label="Heure par defaut"
                    value={hospitalityData.defaultCheckOut || null}
                    onChange={(time) => setHospitalityData(prev => ({ ...prev, defaultCheckOut: time || '' }))}
                  />
                </CardBody>
              </Card>

              {/* Bouton Sauvegarder */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                <Button variant="primary" size="sm" onClick={handleSaveHospitality}>
                  Enregistrer Hospitality
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDEON 3: TOURING PARTY */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <button
          type="button"
          onClick={() => setAccordionTouringPartyOpen(!accordionTouringPartyOpen)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ background: accordionTouringPartyOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                TOURING PARTY
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Configuration des equipes touring
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-200 ${accordionTouringPartyOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>

        {accordionTouringPartyOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="py-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Parametres Touring Party a venir
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDEON 4: TRAVEL */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <button
          type="button"
          onClick={() => setAccordionTravelOpen(!accordionTravelOpen)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ background: accordionTravelOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Plane className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                TRAVEL
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Vols, trains et transports internationaux
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-200 ${accordionTravelOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>

        {accordionTravelOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="py-8 text-center">
              <Plane className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Parametres Travel a venir
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDEON 5: TECHNIQUE */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <button
          type="button"
          onClick={() => setAccordionTechniqueOpen(!accordionTechniqueOpen)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ background: accordionTechniqueOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Wrench className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                TECHNIQUE
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Riders, backline et equipements techniques
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-200 ${accordionTechniqueOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>

        {accordionTechniqueOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="py-8 text-center">
              <Wrench className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Parametres Technique a venir
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDEON 6: TIMETABLE */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <button
          type="button"
          onClick={() => setAccordionTimetableOpen(!accordionTimetableOpen)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ background: accordionTimetableOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                TIMETABLE
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Planning et horaires des performances
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-200 ${accordionTimetableOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>

        {accordionTimetableOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="py-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Parametres Timetable a venir
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ACCORDEON 7: PARTY CREW */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-elevated)', 
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <button
          type="button"
          onClick={() => setAccordionPartyCrewOpen(!accordionPartyCrewOpen)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ background: accordionPartyCrewOpen ? 'rgba(113, 61, 255, 0.05)' : 'transparent' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <PartyPopper className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                PARTY CREW
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Equipes et benevoles festival
              </p>
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 transition-transform duration-200 ${accordionPartyCrewOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </button>

        {accordionPartyCrewOpen && (
          <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="py-8 text-center">
              <PartyPopper className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Parametres Party Crew a venir
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsProductionPage;
