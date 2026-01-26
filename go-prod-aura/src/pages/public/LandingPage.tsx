import {
  Sparkles, ArrowRight, PlayCircle, CheckCircle, Users, Calendar, CreditCard,
  BarChart3, Truck, ShieldCheck, Briefcase, Rocket, Star, Check
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="bg-night-900 dark:bg-night-900 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grad-dark opacity-50" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(113,61,255,0.15) 0%, transparent 50%)'
        }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-grad-card border border-violetNeon-500/20 rounded-full px-4 py-2 mb-8">
              <Sparkles size={16} className="text-violetNeon-500" />
              <span className="text-sm">Nouveau • GO-PROD v2.0</span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Gérez votre marketplace d'artistes avec{' '}
              <span className="bg-grad-violet bg-clip-text text-transparent">
                précision
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Centralisez logistique, bookings et paiements. Conçu pour les agences et startups qui vont vite.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                disabled
                className="inline-flex items-center px-8 py-4 bg-grad-violet text-white rounded-lg font-semibold opacity-50 cursor-not-allowed"
              >
                Essai gratuit
                <ArrowRight size={20} className="ml-2" />
              </button>
              <button
                disabled
                className="inline-flex items-center px-8 py-4 bg-white/10 text-white rounded-lg font-semibold opacity-50 cursor-not-allowed backdrop-blur-sm"
              >
                <PlayCircle size={20} className="mr-2" />
                Voir la démo
              </button>
            </div>

            {/* Bullets */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-400" />
                Sans carte de crédit
              </div>
              <div className="flex items-center">
                <CheckCircle size={16} className="mr-2 text-green-400" />
                Essai gratuit 14 jours
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-violetNeon-500/20 blur-3xl rounded-full" />
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-violet-glow-strong">
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop"
                alt="GO-PROD Dashboard"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-night-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Fonctionnalités complètes
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour gérer votre marketplace d'artistes efficacement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <div className="w-12 h-12 bg-violetNeon-500/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="text-violetNeon-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestion d'artistes</h3>
              <p className="text-gray-400">
                Profils, portefeuilles, disponibilités et tarifs centralisés.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <div className="w-12 h-12 bg-violetNeon-500/20 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="text-violetNeon-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Planification intelligente</h3>
              <p className="text-gray-400">
                Automatisez les bookings, gérez les conflits, synchronisez les calendriers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <div className="w-12 h-12 bg-violetNeon-500/20 rounded-lg flex items-center justify-center mb-4">
                <CreditCard className="text-violetNeon-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Paiements intégrés</h3>
              <p className="text-gray-400">
                Facturation, paiements fractionnés et multi-devises.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <div className="w-12 h-12 bg-violetNeon-500/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="text-violetNeon-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytique & Insights</h3>
              <p className="text-gray-400">
                Suivez performance, revenus et taux d'occupation en temps réel.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <div className="w-12 h-12 bg-violetNeon-500/20 rounded-lg flex items-center justify-center mb-4">
                <Truck className="text-violetNeon-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Suite Logistique</h3>
              <p className="text-gray-400">
                Coordonnez transports, matériels et ressources via des workflows.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <div className="w-12 h-12 bg-violetNeon-500/20 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck className="text-violetNeon-500" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurité Entreprise</h3>
              <p className="text-gray-400">
                Rôles, 2FA, journaux d'audit. Conforme aux standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Conçu pour vous
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Que vous soyez agence établie ou startup en croissance
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Agencies */}
            <div className="bg-grad-card border border-white/10 rounded-3xl p-12 hover:shadow-violet-glow transition-all">
              <div className="w-16 h-16 bg-violetNeon-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Briefcase className="text-violetNeon-500" size={32} />
              </div>
              <h3 className="text-3xl font-bold mb-4">Pour les agences</h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span>Portail client & marque blanche</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span>Gestion multi-projets simultanés</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span>Suivi automatique des commissions</span>
                </li>
              </ul>
            </div>

            {/* Startups */}
            <div className="bg-grad-card border border-white/10 rounded-3xl p-12 hover:shadow-violet-glow transition-all">
              <div className="w-16 h-16 bg-violetNeon-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Rocket className="text-violetNeon-500" size={32} />
              </div>
              <h3 className="text-3xl font-bold mb-4">Pour les startups</h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span>Mise en route rapide (15 min)</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span>API & intégrations prêtes à l'emploi</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span>Scalabilité illimitée incluse</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-night-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Plébiscité par les équipes créatives
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Rejoignez des centaines d'agences qui ont transformé leur workflow
            </p>
          </div>

          {/* Logo Cloud */}
          <div className="flex flex-wrap items-center justify-center gap-12 mb-16 opacity-50">
            <div className="text-2xl font-bold">Creative Agency</div>
            <div className="text-2xl font-bold">ArtFlow</div>
            <div className="text-2xl font-bold">BookHub</div>
            <div className="text-2xl font-bold">TalentCo</div>
          </div>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                "GO-PROD a révolutionné notre gestion d'artistes. Nous avons réduit nos tâches admin de 60% et doublé notre capacité."
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                  alt="Marie Dubois"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold">Marie Dubois</div>
                  <div className="text-sm text-gray-400">CEO, Creative Agency</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                "L'automatisation des bookings et la gestion des conflits nous font gagner 20h par semaine. Indispensable."
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
                  alt="Thomas Martin"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold">Thomas Martin</div>
                  <div className="text-sm text-gray-400">COO, ArtFlow</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-6">
                "L'API est puissante et bien documentée. Nous avons intégré GO-PROD à notre stack en quelques jours seulement."
              </p>
              <div className="flex items-center">
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
                  alt="Sophie Bernard"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold">Sophie Bernard</div>
                  <div className="text-sm text-gray-400">CTO, TalentCo</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tarification simple et transparente
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Choisissez le plan qui correspond à vos besoins. Changez à tout moment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <p className="text-gray-400 mb-6">Pour petites équipes</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">CHF 29</span>
                <span className="text-gray-400">/mois</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Jusqu'à 10 artistes</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Planification de base</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Gestion des paiements</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Support email</span>
                </li>
              </ul>
              <button
                disabled
                className="block w-full text-center px-6 py-3 bg-white/10 text-white rounded-lg font-semibold opacity-50 cursor-not-allowed"
              >
                Démarrer l'essai
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-grad-card border-2 border-violetNeon-500 rounded-2xl p-8 relative shadow-violet-glow">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-grad-violet text-white text-sm font-semibold px-4 py-1 rounded-full">
                Le plus populaire
              </div>
              <h3 className="text-2xl font-bold mb-2">Professional</h3>
              <p className="text-gray-400 mb-6">Pour équipes en croissance</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">CHF 99</span>
                <span className="text-gray-400">/mois</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Jusqu'à 50 artistes</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Planification avancée & automatisation</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Dashboard analytique</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Accès API</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Support prioritaire</span>
                </li>
              </ul>
              <button
                disabled
                className="block w-full text-center px-6 py-3 bg-grad-violet text-white rounded-lg font-semibold opacity-50 cursor-not-allowed"
              >
                Démarrer l'essai
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-grad-card border border-white/10 rounded-2xl p-8 hover:border-violetNeon-500/50 transition-all">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <p className="text-gray-400 mb-6">Sur mesure</p>
              <div className="mb-6">
                <span className="text-5xl font-bold">Sur devis</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Artistes illimités</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Portail marque blanche</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Intégrations custom</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">Account Manager dédié</span>
                </li>
                <li className="flex items-start">
                  <Check size={20} className="mr-3 mt-1 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">SLA 24/7</span>
                </li>
              </ul>
              <button
                disabled
                className="block w-full text-center px-6 py-3 bg-white/10 text-white rounded-lg font-semibold opacity-50 cursor-not-allowed"
              >
                Contacter les ventes
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grad-violet opacity-10" />
        <div className="absolute inset-0 shadow-violet-glow-strong" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Prêt à transformer vos opérations ?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Rejoignez les équipes qui utilisent GO-PROD pour scaler sereinement.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              disabled
              className="inline-flex items-center px-8 py-4 bg-grad-violet text-white rounded-lg font-semibold opacity-50 cursor-not-allowed"
            >
              Essai gratuit
              <ArrowRight size={20} className="ml-2" />
            </button>
            <button
              disabled
              className="inline-flex items-center px-8 py-4 bg-white/10 text-white rounded-lg font-semibold opacity-50 cursor-not-allowed backdrop-blur-sm"
            >
              Planifier une démo
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}




