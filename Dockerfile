FROM node:18-alpine as builder

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Copie des fichiers sources
COPY . .

# Construction de l'application
ARG API_URL
ENV VITE_API_URL=${API_URL}
RUN npm run build

# Configuration du serveur nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
