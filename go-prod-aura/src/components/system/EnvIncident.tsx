export default function EnvIncident() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white text-center p-4">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-4">⚠️ Configuration manquante</h1>
        <p className="mb-4 text-gray-400">
          Les variables d'environnement Supabase ne sont pas définies.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 text-left">
          <code className="text-xs text-gray-300 block">
            VITE_SUPABASE_URL<br/>
            VITE_SUPABASE_ANON_KEY
          </code>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Créez un fichier <code className="bg-gray-900 px-2 py-1 rounded">.env</code> à la racine du projet avec ces variables.
        </p>
      </div>
    </div>
  );
}




