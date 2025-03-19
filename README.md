# Barcode Scanner Application

Application de scan de codes-barres avec interface web et stockage local. Cette application permet de scanner et comparer des codes-barres avec une interface utilisateur intuitive et un système de gestion des données robuste.

## Fonctionnalités

### Scan et Comparaison
- Scan de codes-barres via webcam
- Comparaison automatique des codes
- Figeage automatique lors des popups pour éviter les scans non désirés
- Support du mode manuel et automatique

### Interface Utilisateur
- Interface moderne et intuitive
- Mode sombre/clair
- Taille de police ajustable
- Responsive design (mobile/desktop)

### Gestion des Données
- Historique complet des scans
- Recherche dynamique dans l'historique
- Filtrage par utilisateur, date, et résultat
- Export Excel des données

### Administration
- Interface administrateur dédiée
- Gestion des utilisateurs
- Visualisation des statistiques
- Contrôle d'accès sécurisé

## Installation

### Prérequis
- Docker
- Docker Compose

### Installation rapide

1. Cloner le dépôt :
```bash
git clone https://github.com/Siagutrop/barcode-scanner.git
cd barcode-scanner
```

2. Utiliser la dernière version stable :
```bash
git checkout v1.0.0  # Recommandé
```

3. Configurer l'environnement :
```bash
cp .env.example .env
```

4. Démarrer l'application :
```bash
docker-compose up -d
```

L'application sera accessible à :
- Frontend : http://localhost:4173
- Backend : http://localhost:3002

## Configuration

### Variables d'environnement (.env)
```env
NODE_ENV=production
PORT_FRONTEND=4173
PORT_BACKEND=3002
DB_PATH=/app/server/scanner.db
```

### Persistance des données
Les données sont automatiquement persistées dans :
- Base de données : `./server/scanner.db`
- Logs : `./logs/`

## Développement

### Installation locale (sans Docker)
```bash
# Installation des dépendances
npm install

# Démarrer en mode développement
npm run dev
```

### Structure du projet
```
.
├── src/               # Frontend React
│   ├── App.jsx       # Composant principal
│   └── App.css       # Styles
├── server/           # Backend Node.js
│   └── server.js     # Serveur Express
├── dist/            # Build frontend
├── Dockerfile       # Configuration Docker
└── docker-compose.yml # Configuration Docker Compose
```

## Maintenance

### Sauvegarde
```bash
# Sauvegarder la base de données
cp ./server/scanner.db ./backups/scanner_$(date +%Y%m%d).db
```

### Mise à jour
```bash
# Mettre à jour depuis Git
git pull
docker-compose up -d --build
```

### Logs
Les logs sont disponibles dans :
- `./logs/` pour les logs applicatifs
- `docker-compose logs -f` pour les logs Docker

## Sécurité
- Authentification utilisateur requise
- Gestion des sessions sécurisée
- CORS configuré
- Validation des données

## Licence
[Votre licence]

## Contribution
Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour plus de détails.
