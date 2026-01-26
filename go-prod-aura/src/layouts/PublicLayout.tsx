import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function PublicLayout() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-night-900 dark:bg-night-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-night-900/80 dark:bg-night-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              {/* TODO: Remplacer par SVG logo quand disponible */}
              <span className="text-2xl font-bold bg-grad-violet bg-clip-text text-transparent">
                GO-PROD
              </span>
            </div>

            {/* Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Fonctionnalités
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Tarifs
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Témoignages
              </button>
              <button
                disabled
                className="text-gray-300 opacity-50 cursor-not-allowed"
              >
                Documentation
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                disabled
                className="text-gray-300 opacity-50 cursor-not-allowed"
              >
                Se connecter
              </button>
              <button
                disabled
                className="px-4 py-2 bg-grad-violet text-white rounded-lg font-semibold opacity-50 cursor-not-allowed"
              >
                Commencer
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-night-800 dark:bg-night-800 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Produit */}
            <div>
              <h3 className="text-white font-semibold mb-4">Produit</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection('features')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Fonctionnalités
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing')}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Tarifs
                  </button>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Mises à jour
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Roadmap
                  </span>
                </li>
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <h3 className="text-white font-semibold mb-4">Entreprise</h3>
              <ul className="space-y-2">
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    À propos
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Blog
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Carrières
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Contact
                  </span>
                </li>
              </ul>
            </div>

            {/* Ressources */}
            <div>
              <h3 className="text-white font-semibold mb-4">Ressources</h3>
              <ul className="space-y-2">
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Documentation
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    API
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Support
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Statut
                  </span>
                </li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h3 className="text-white font-semibold mb-4">Légal</h3>
              <ul className="space-y-2">
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Confidentialité
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Conditions
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Cookies
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Licences
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} GO-PROD. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}




