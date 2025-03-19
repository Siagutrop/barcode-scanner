# Guide de Contribution

Merci de votre intérêt pour contribuer à l'application Barcode Scanner ! Ce guide vous aidera à comprendre le processus de contribution.

## Points Importants

### Fonctionnalités Critiques
- Le figeage de l'application lors des popups est une fonctionnalité critique qui doit être préservée
- Toute modification doit maintenir la stabilité de la comparaison des codes-barres
- L'interface utilisateur doit rester intuitive et accessible

## Processus de Contribution

1. **Fork du projet**
2. **Créer une branche**
   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```

3. **Développement**
   - Respecter les standards de code
   - Maintenir la compatibilité Docker
   - Tester localement avec `docker-compose up`

4. **Tests**
   - Vérifier que le figeage des popups fonctionne
   - Tester la persistance des données
   - Valider l'interface utilisateur

5. **Commit**
   ```bash
   git commit -m "feat: description de la fonctionnalité"
   ```

6. **Pull Request**
   - Décrire clairement les changements
   - Mentionner les impacts sur les fonctionnalités existantes
   - Ajouter des captures d'écran si pertinent

## Standards de Code

### Frontend (React)
- Utiliser des composants fonctionnels
- Gérer correctement les états avec useState/useEffect
- Maintenir la réactivité de l'interface

### Backend (Node.js)
- Suivre les principes REST
- Gérer les erreurs de manière appropriée
- Documenter les nouveaux endpoints

### Docker
- Optimiser les builds
- Maintenir la persistance des données
- Respecter les bonnes pratiques de sécurité

## Documentation

- Mettre à jour le README.md si nécessaire
- Documenter les nouvelles fonctionnalités
- Maintenir le CHANGELOG.md à jour

## Questions

Pour toute question, n'hésitez pas à ouvrir une issue sur GitHub.
