#!/bin/bash

# =============================================================================
# Script de vérification architecture multitenant Go-Prod AURA
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 VÉRIFICATION ARCHITECTURE MULTITENANT GO-PROD AURA${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Vérifier si on est dans le bon répertoire
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Erreur : Ce script doit être exécuté depuis la racine du projet${NC}"
    exit 1
fi

# Menu
echo "Choisissez le type de vérification :"
echo ""
echo "  1) Vérification complète (SQL) - Affichage détaillé"
echo "  2) Vérification rapide (JavaScript) - Rapport JSON"
echo "  3) Les deux"
echo "  4) Générer un rapport et l'enregistrer"
echo ""
read -p "Votre choix (1-4) : " choice

case $choice in
    1)
        echo -e "\n${BLUE}📋 Exécution de la vérification SQL...${NC}\n"
        
        # Vérifier si Supabase CLI est installé
        if ! command -v supabase &> /dev/null; then
            echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
            echo "Installez-le avec : npm install -g supabase"
            exit 1
        fi
        
        # Exécuter le script SQL
        supabase db execute -f supabase/scripts/verify_multitenant_architecture.sql
        
        echo -e "\n${GREEN}✅ Vérification SQL terminée${NC}"
        ;;
        
    2)
        echo -e "\n${BLUE}🔧 Exécution de la vérification JavaScript...${NC}\n"
        
        # Vérifier les variables d'environnement
        if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
            echo -e "${YELLOW}⚠️ Variables d'environnement manquantes${NC}"
            echo "Définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY"
            echo ""
            echo "Exemple :"
            echo "  export SUPABASE_URL='https://xxx.supabase.co'"
            echo "  export SUPABASE_SERVICE_ROLE_KEY='eyJhb...'"
            exit 1
        fi
        
        # Vérifier si Node.js est installé
        if ! command -v node &> /dev/null; then
            echo -e "${RED}❌ Node.js n'est pas installé${NC}"
            exit 1
        fi
        
        # Installer les dépendances si nécessaire
        if [ ! -d "node_modules/@supabase/supabase-js" ]; then
            echo -e "${BLUE}📦 Installation des dépendances...${NC}"
            npm install @supabase/supabase-js
        fi
        
        # Exécuter le script JavaScript
        node supabase/scripts/verify_multitenant_architecture.js
        
        exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            echo -e "\n${GREEN}✅ Vérification JavaScript terminée - Aucun problème détecté${NC}"
        else
            echo -e "\n${RED}❌ Vérification JavaScript terminée - Problèmes détectés${NC}"
            exit 1
        fi
        ;;
        
    3)
        echo -e "\n${BLUE}📋 Exécution des deux vérifications...${NC}\n"
        
        # SQL
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}1/2 - Vérification SQL${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        
        supabase db execute -f supabase/scripts/verify_multitenant_architecture.sql
        
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}2/2 - Vérification JavaScript${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        
        node supabase/scripts/verify_multitenant_architecture.js
        
        echo -e "\n${GREEN}✅ Toutes les vérifications terminées${NC}"
        ;;
        
    4)
        echo -e "\n${BLUE}📄 Génération du rapport...${NC}\n"
        
        # Créer le dossier reports s'il n'existe pas
        mkdir -p supabase/reports
        
        # Nom du fichier avec timestamp
        timestamp=$(date +"%Y%m%d_%H%M%S")
        report_file="supabase/reports/verification_${timestamp}.json"
        
        # Exécuter et sauvegarder
        node supabase/scripts/verify_multitenant_architecture.js --json > "$report_file"
        
        echo -e "${GREEN}✅ Rapport sauvegardé : $report_file${NC}"
        
        # Afficher un résumé
        echo ""
        echo -e "${BLUE}📊 Résumé :${NC}"
        cat "$report_file" | grep -E '"status"|"totalTables"|"tablesWithCompanyId"|"tablesWithoutCompanyId"|"integrityViolations"' || true
        ;;
        
    *)
        echo -e "${RED}❌ Choix invalide${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Terminé${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"













