#!/bin/sh

# Attendre que le dossier de données soit disponible
until [ -d "/app/data" ]; do
  echo "Attente du dossier de données..."
  sleep 1
done

# Initialiser la base de données si elle n'existe pas
if [ ! -f "/app/data/scanner.db" ]; then
  echo "Création de la base de données..."
  npx prisma db push
  node init-db.js
fi

# Démarrer Prisma Studio
exec npx prisma studio --port 5555 --browser none
