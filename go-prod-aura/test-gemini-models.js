// Script pour lister les modèles Gemini disponibles
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY non définie. Définissez-la avec: set GEMINI_API_KEY=votre_clé");
  process.exit(1);
}

async function listModels() {
  try {
    console.log("🔍 Récupération des modèles Gemini disponibles...\n");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Erreur API:", error);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log("✅ Modèles disponibles:\n");
    
    // Filtrer les modèles qui supportent generateContent
    const generateContentModels = data.models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log(`📊 ${generateContentModels.length} modèles supportent generateContent:\n`);
    
    generateContentModels.forEach(model => {
      console.log(`  • ${model.name}`);
      console.log(`    Display: ${model.displayName}`);
      console.log(`    Description: ${model.description}`);
      console.log(`    Input limit: ${model.inputTokenLimit} tokens`);
      console.log(`    Output limit: ${model.outputTokenLimit} tokens`);
      console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log();
    });
    
    // Trouver les modèles avec vision/PDF
    console.log("\n🎯 Modèles recommandés pour PDF:");
    const visionModels = generateContentModels.filter(model => 
      model.name.includes('pro') || model.name.includes('flash')
    );
    
    visionModels.forEach(model => {
      console.log(`  ✓ ${model.name}`);
    });
    
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }
}

listModels();
