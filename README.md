# Scanner de Codes-Barres

Application web permettant de scanner et comparer des codes-barres, avec interface d'administration et historique.

## Prérequis

- Docker
- Docker Compose

## Installation rapide

1. Clonez le dépôt :
```bash
git clone <votre-depot>
cd barcode-scanner
```

2. Copiez le fichier d'exemple de configuration :
```bash
cp .env.example .env
```

3. Démarrez l'application :
```bash
docker-compose up -d
```

L'application sera accessible à :
- Interface utilisateur : http://localhost (ou votre IP)
- API : http://localhost:3000 (ou votre IP:3000)
- Prisma Studio (gestion base de données) : http://localhost:5555 (ou votre IP:5555)

Identifiants par défaut :
- Utilisateur : admin
- Mot de passe : admin

## Configuration

Modifiez le fichier `.env` pour personnaliser :
- `FRONTEND_PORT` : Port pour l'interface utilisateur (défaut: 80)
- `API_PORT` : Port pour l'API (défaut: 3000)
- `PRISMA_PORT` : Port pour Prisma Studio (défaut: 5555)
- `API_URL` : URL de l'API (défaut: http://localhost:3000)
- `DB_PATH` : Chemin pour stocker les données (défaut: ./data)
- `ADMIN_USERNAME` : Nom d'utilisateur admin (défaut: admin)
- `ADMIN_PASSWORD` : Mot de passe admin (défaut: admin)

## Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Redémarrer les services
docker-compose restart

# Arrêter l'application
docker-compose down

# Mettre à jour l'application
docker-compose pull
docker-compose up -d --build
```

## Gestion de la base de données

Prisma Studio est accessible sur http://localhost:5555 (ou votre-ip:5555). Il permet de :
- Visualiser et modifier les données
- Gérer les utilisateurs et les scans
- Faire des sauvegardes manuelles

## Sécurité

⚠️ Important : Après le premier démarrage, connectez-vous avec les identifiants par défaut et :
1. Créez un nouvel utilisateur administrateur
2. Changez le mot de passe de l'utilisateur admin par défaut
3. Modifiez le fichier .env pour changer les identifiants par défaut

## Sauvegarde

Les données sont stockées dans le dossier spécifié par `DB_PATH`. Pour sauvegarder :
1. Arrêtez l'application : `docker-compose down`
2. Copiez le dossier de données
3. Redémarrez : `docker-compose up -d`

## Dépannage

1. Si l'application n'est pas accessible :
   - Vérifiez que les ports ne sont pas utilisés
   - Vérifiez les logs : `docker-compose logs`
   - Assurez-vous que les pare-feux autorisent les ports

2. Si la caméra ne fonctionne pas :
   - Vérifiez que vous utilisez HTTPS ou localhost
   - Autorisez l'accès à la caméra dans votre navigateur

3. Si Prisma Studio ne se connecte pas :
   - Vérifiez les logs : `docker-compose logs prisma-studio`
   - Assurez-vous que le dossier de données existe et a les bonnes permissions
