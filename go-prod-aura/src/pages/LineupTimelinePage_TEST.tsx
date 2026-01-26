import React from "react";

export default function LineupTimelinePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Timeline Booking - Test
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        Page de test pour diagnostiquer le problème de page blanche.
      </p>
      
      <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
        <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
          ✅ Page Timeline fonctionne !
        </h2>
        <p className="text-green-700 dark:text-green-300 mt-1">
          Si vous voyez ce message, la page de base fonctionne.
        </p>
      </div>

      <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
        <h3 className="text-md font-semibold text-blue-800 dark:text-blue-200">
          Prochaines étapes :
        </h3>
        <ul className="text-blue-700 dark:text-blue-300 mt-1 list-disc list-inside">
          <li>Vérifier la console du navigateur (F12)</li>
          <li>Noter les erreurs JavaScript</li>
          <li>Tester les composants un par un</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
          Informations de debug :
        </h3>
        <div className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
          <p>URL: {window.location.href}</p>
          <p>Timestamp: {new Date().toLocaleString()}</p>
          <p>User Agent: {navigator.userAgent}</p>
        </div>
      </div>
    </div>
  );
}

