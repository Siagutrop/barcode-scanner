FROM node:18-alpine

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copie des fichiers sources
COPY . .

# Génération du client Prisma
RUN npx prisma generate

# Script d'initialisation
COPY init-db.js ./
COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
