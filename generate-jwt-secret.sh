#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────
# 🔐 GÉNÉRATEUR DE CLÉ JWT SÉCURISÉE
# ─────────────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════════════════"
echo "🔐 GÉNÉRATEUR DE CLÉ JWT SÉCURISÉE"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Générer une clé JWT sécurisée (32+ caractères recommandé)
JWT_SECRET=$(openssl rand -base64 32)

echo "✓ Clé JWT générée avec succès!"
echo ""
echo "Copier cette clé dans votre fichier backend/.env :"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "JWT_SECRET=$JWT_SECRET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ÉTAPES:"
echo "1. Ouvrir le fichier: backend/.env"
echo "2. Remplacer la ligne JWT_SECRET existante"
echo "3. Par: JWT_SECRET=$JWT_SECRET"
echo "4. Sauvegarder le fichier"
echo "5. Redémarrer le serveur: npm start"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
