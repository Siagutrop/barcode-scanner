# Barcode Scanner Application

Application de scan de codes-barres avec interface web et stockage local. Cette application permet de scanner et comparer des codes-barres avec une interface utilisateur intuitive et un système de gestion des données robuste.

## Fonctionnalités

### Scan et Comparaison
- Scan de codes-barres via entrée manuel ou douchette
- Comparaison automatique des codes

### Interface Utilisateur
- Interface moderne et intuitive
- Taille de police ajustable

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

MIT License

Copyright (c) 2025 Siagutrop

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contribution
Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour plus de détails.
