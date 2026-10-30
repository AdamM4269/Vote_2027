# Questionnaires pratiques

Application statique en HTML, CSS et JavaScript classique. Elle fonctionne sans dépendance, sans compilation et peut être ouverte directement avec `index.html`.

## Arborescence

- `index.html` présente les questionnaires du registre.
- `questionnaire.html` affiche une question à la fois et enregistre les réponses de la session.
- `recap.html` affiche les réponses, les solutions et le champ de ville.
- `css/style.css` contient les styles responsives.
- `js/app.js` contient le moteur générique.
- `js/Lib_Questionnaires.js` référence les questionnaires disponibles.
- `js/Lib_Questions_Vote.js` et `js/Lib_Questions_Vote_Order.js` contiennent les questions de vote et leur arbre conditionnel.

## Modifier les questions et l’arbre

Ajoutez une question dans `Lib_Questions_Vote.js`, avec un identifiant, son texte et deux tableaux de solutions (`oui` et `non`). Ajoutez ensuite son nœud dans `Lib_Questions_Vote_Order.js`. Chaque branche doit mener à l’identifiant d’une question existante ou à `null` pour terminer le parcours. Le départ est défini par `depart`.

## Ajouter un questionnaire

Créez un fichier de questions et un fichier d’arbre pour le nouveau questionnaire, puis incluez ces deux scripts dans les trois pages HTML avant `Lib_Questionnaires.js`. Ajoutez une entrée au registre avec les fonctions `questions` et `ordre`. Le moteur n’a pas à être modifié.

## Tester et publier

Ouvrez `index.html` dans un navigateur, sélectionnez « Commencer », suivez les réponses jusqu’au récapitulatif, puis testez le retour, le choix d’une ville et le redémarrage. Pour tester avec un serveur local, utilisez par exemple l’extension Live Server de VS Code ; aucun outil de compilation n’est nécessaire.

Pour publier, envoyez les fichiers sur la branche `main` de GitHub, puis ouvrez **Settings > Pages**. Sélectionnez la branche `main` et le dossier racine (`/`), puis enregistrez. Les liens et scripts étant relatifs, le site fonctionne aussi lorsqu’il est publié dans un sous-dossier GitHub Pages.