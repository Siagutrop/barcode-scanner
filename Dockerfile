# Build stage
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
COPY . .

# Définir l'URL de l'API pour le build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm install
RUN npm run build

# Production stage
FROM node:18-alpine

# Créer l'utilisateur node s'il n'existe pas déjà
RUN deluser --remove-home node 2>/dev/null || true && \
    addgroup -S node && \
    adduser -S -G node -u 1000 node

WORKDIR /app

# Créer les dossiers nécessaires
RUN mkdir -p logs server/data && \
    chown -R node:node /app

# Copier les fichiers avec les bonnes permissions
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node package*.json ./
COPY --chown=node:node start-prod.js ./

# Installation des dépendances
USER node
WORKDIR /app/server
RUN npm install --production
WORKDIR /app
RUN npm install --production

EXPOSE 3002 4173
CMD ["npm", "run", "start-prod"]
