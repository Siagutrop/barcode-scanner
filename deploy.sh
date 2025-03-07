#!/bin/bash

# Créer le dossier de l'application sur le serveur
ssh root@192.168.1.51 "mkdir -p /opt/barcode-scanner"

# Copier les fichiers nécessaires
scp -r dist docker-compose.yml nginx.conf Dockerfile server root@192.168.1.51:/opt/barcode-scanner/

# Se connecter au serveur et démarrer l'application
ssh root@192.168.1.51 "cd /opt/barcode-scanner && docker-compose up --build -d"
