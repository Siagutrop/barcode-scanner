# Build stage
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package*.json ./
COPY start-prod.js ./

RUN npm install --production

EXPOSE 3002 4173
CMD ["npm", "run", "start-prod"]
