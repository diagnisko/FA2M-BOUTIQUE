```markdown
# FA2M — Version améliorée de la page d'accueil

Ce dépôt / ces fichiers contiennent la version améliorée de la page d'accueil avec :
- Section "Produits en vedette" : carrousel draggable, autoplay, pause au hover, snap.
- Micro‑interactions : tilt, parallax d'image, hover cards, feedback Lottie au clic.
- Sections supplémentaires pour renforcer la conversion : KPIs, Trust/garanties, Témoignages, Newsletter CTA.
- Bouton WhatsApp flottant configuré avec ton numéro Sénégalais +221 78 133 23 23 -> format wa.me : `221781332323`.
- Respect de l'accessibilité (navigation clavier pour le carrousel) et des préférences utilisateurs (prefers-reduced-motion).
- Robustesse et fallbacks : pas d'erreurs si GSAP/Lottie non chargés, lazy loading d'images, gestion visibilitychange.

Installation / personnalisation rapide
1. Remplace les images dans `assets/` :
   - `assets/logo.png` (logo)
   - `assets/favicon.png` (favicon)
   - `assets/products/feat-1.jpg` … `feat-4.jpg` (images vedette)
   - `assets/trust/*.svg` (icônes trust)
2. Vérifie `script.js` : `PHONE_NUMBER` est défini à `221781332323`. Si tu veux changer le numéro, remplace-le par le format international sans `+` ni espaces.
3. Déploiement :
   - Hébergement statique (Netlify, Vercel, GitHub Pages) : connecte le repo ou dépose les fichiers.
4. Optimisations recommandées :
   - Convertir les images en WebP et générer plusieurs tailles (srcset) pour performance.
   - Ajouter un backend / webhook pour la newsletter au lieu d'ouvrir WhatsApp (optionnel).
   - Pour animations supplémentaires (page-to-page transitions, scènes 3D), migration Next.js + GSAP.

Étapes suivantes que je peux faire pour toi (dis‑moi laquelle) :
- Déployer une démo publique sur Netlify / Vercel et te fournir le lien.
- Optimiser les images automatiquement (WebP + responsive).
- Ajouter paiements (Stripe) et panier (si tu veux un checkout en plus de WhatsApp).
- Créer / remplacer Lottie par une animation sur mesure.
