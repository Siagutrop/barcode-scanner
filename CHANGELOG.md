# Changelog

## [1.0.0] - 2025-03-19

### Ajouts
- Configuration Docker complète pour un déploiement facile
- Documentation détaillée dans le README.md
- Configuration des variables d'environnement avec .env.example
- Healthcheck Docker pour la surveillance du service
- Système de logs persistants

### Fonctionnalités préservées
- Figeage automatique de l'application lors des popups (fonctionnalité critique)
- Interface de recherche dynamique dans l'historique des scans
- Export Excel des données
- Mode administrateur avec gestion des utilisateurs
- Scan de codes-barres avec comparaison automatique

### Optimisations
- Build multi-stage pour une image Docker optimisée
- Compression des assets statiques
- Persistance des données avec volumes Docker
- Configuration CORS simplifiée

### Sécurité
- Variables d'environnement sécurisées
- Healthcheck intégré
- Logs séparés et persistants
