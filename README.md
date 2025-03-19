# Barcode Scanner Application

Application de scan de codes-barres avec interface web et stockage local.

## Fonctionnalités

- Scan de codes-barres via webcam
- Comparaison automatique des codes
- Interface utilisateur intuitive
- Historique des scans
- Mode administrateur
- Recherche dynamique dans l'historique
- Export Excel
- Figeage automatique lors des popups

## Prérequis

- Docker
- Docker Compose

## Installation rapide

1. Cloner le dépôt :
```bash
git clone [votre-repo]
cd barcode-scanner
```

2. Démarrer l'application :
```bash
docker-compose up -d
```

L'application sera accessible à :
- Frontend : http://localhost:4173
- Backend : http://localhost:3002

## Configuration

Par défaut, l'application utilise une base de données SQLite persistante dans `./server/scanner.db`.

## Commandes utiles

```bash
# Démarrer l'application
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter l'application
docker-compose down

# Reconstruire l'image
docker-compose up -d --build
```

## Structure du projet

```
.
├── src/               # Code source frontend (React)
├── server/            # Code source backend (Node.js)
├── dist/             # Build frontend
├── Dockerfile        # Configuration Docker
└── docker-compose.yml # Configuration Docker Compose
```

## Développement

Pour développer localement sans Docker :

```bash
# Installation des dépendances
npm install

# Démarrer en mode développement
npm run dev
```

## Licence

[Votre licence]
