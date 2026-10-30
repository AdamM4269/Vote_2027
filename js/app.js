(function () {
  "use strict";

  const questionnaireId = new URLSearchParams(window.location.search).get("q");

  function obtenirConfig(id) {
    const entree = window.QUESTIONNAIRES && window.QUESTIONNAIRES[id];
    if (!entree) {
      return null;
    }

    try {
      const config = {
        id: id,
        titre: entree.titre,
        description: entree.description,
        questions: entree.questions(),
        ordre: entree.ordre()
      };
      config.arbreValide = validerArbre(config);
      return config;
    } catch (erreur) {
      console.warn("Configuration invalide pour le questionnaire « " + id + " ». ", erreur);
      return null;
    }
  }

  function validerArbre(config) {
    const questions = config.questions || {};
    const noeuds = config.ordre && config.ordre.noeuds ? config.ordre.noeuds : {};
    const depart = config.ordre && config.ordre.depart;
    const idsQuestions = Object.keys(questions);
    const idsNoeuds = Object.keys(noeuds);
    let valide = true;

    function avertir(message) {
      valide = false;
      console.warn("Arbre du questionnaire « " + config.id + " » : " + message);
    }

    if (!depart || !questions[depart]) {
      avertir("le point de départ « " + depart + " » ne correspond à aucune question.");
    }

    idsNoeuds.forEach(function (id) {
      if (!questions[id]) {
        avertir("le nœud « " + id + " » ne correspond à aucune question.");
      }

      ["oui", "non"].forEach(function (reponse) {
        const noeud = noeuds[id];
        if (!noeud || !Object.prototype.hasOwnProperty.call(noeud, reponse)) {
          avertir("la branche « " + reponse + " » manque pour « " + id + " ».");
          return;
        }

        const suivant = noeud[reponse];
        if (suivant !== null && (typeof suivant !== "string" || !questions[suivant])) {
          avertir("la branche « " + reponse + " » de « " + id + " » cite une question inconnue.");
        }
      });
    });

    idsQuestions.forEach(function (id) {
      if (!noeuds[id]) {
        avertir("aucun nœud n’est défini pour la question « " + id + " ».");
      }
    });

    const atteignables = new Set();
    function parcourirDepuisDepart(id) {
      if (id === null || typeof id !== "string" || atteignables.has(id) || !noeuds[id]) {
        return;
      }
      atteignables.add(id);
      ["oui", "non"].forEach(function (reponse) {
        const suivant = noeuds[id][reponse];
        if (typeof suivant === "string") {
          parcourirDepuisDepart(suivant);
        }
      });
    }

    parcourirDepuisDepart(depart);
    idsQuestions.forEach(function (id) {
      if (!atteignables.has(id)) {
        avertir("la question « " + id + " » est inaccessible depuis le départ.");
      }
    });

    const visites = new Set();
    const chemin = new Set();
    function verifierBoucle(id) {
      if (id === null || typeof id !== "string" || !noeuds[id]) {
        return;
      }
      if (chemin.has(id)) {
        avertir("une boucle passe par la question « " + id + " ».");
        return;
      }
      if (visites.has(id)) {
        return;
      }

      chemin.add(id);
      ["oui", "non"].forEach(function (reponse) {
        const suivant = noeuds[id][reponse];
        if (typeof suivant === "string") {
          verifierBoucle(suivant);
        }
      });
      chemin.delete(id);
      visites.add(id);
    }

    idsNoeuds.forEach(verifierBoucle);
    return valide;
  }

  function cleReponses(id) {
    return "questionnaire:" + id + ":reponses";
  }

  function chargerReponses(id) {
    try {
      const contenu = window.sessionStorage.getItem(cleReponses(id));
      if (!contenu) {
        return [];
      }
      const reponses = JSON.parse(contenu);
      return Array.isArray(reponses) ? reponses : null;
    } catch (erreur) {
      console.warn("Les réponses enregistrées n’ont pas pu être lues.", erreur);
      return null;
    }
  }

  function enregistrerReponses(id, reponses) {
    try {
      window.sessionStorage.setItem(cleReponses(id), JSON.stringify(reponses));
      return true;
    } catch (erreur) {
      console.warn("Les réponses n’ont pas pu être enregistrées.", erreur);
      return false;
    }
  }

  function verifierParcours(config, reponses) {
    let prochaineQuestion = config.ordre.depart;

    for (let index = 0; index < reponses.length; index += 1) {
      const reponse = reponses[index];
      if (!reponse || reponse.id !== prochaineQuestion || !["oui", "non"].includes(reponse.reponse)) {
        return { valide: false, termine: false, prochaine: null };
      }

      const question = config.questions[reponse.id];
      const noeud = config.ordre.noeuds[reponse.id];
      if (!question || !question.solutions || !Array.isArray(question.solutions[reponse.reponse]) || !noeud) {
        return { valide: false, termine: false, prochaine: null };
      }

      prochaineQuestion = noeud[reponse.reponse];
      if (typeof prochaineQuestion === "undefined") {
        return { valide: false, termine: false, prochaine: null };
      }
      if (prochaineQuestion === null && index < reponses.length - 1) {
        return { valide: false, termine: false, prochaine: null };
      }
    }

    return {
      valide: true,
      termine: reponses.length > 0 && prochaineQuestion === null,
      prochaine: prochaineQuestion
    };
  }

  function afficherMessage(conteneur, message, lienTexte, lienCible) {
    conteneur.replaceChildren();
    conteneur.hidden = false;
    const paragraphe = document.createElement("p");
    paragraphe.textContent = message;
    conteneur.appendChild(paragraphe);

    if (lienTexte && lienCible) {
      const lien = document.createElement("a");
      lien.href = lienCible;
      lien.textContent = lienTexte;
      conteneur.appendChild(lien);
    }
  }

  function afficherErreurQuestionnaire(message) {
    document.getElementById("zone-question").hidden = true;
    afficherMessage(document.getElementById("erreur-questionnaire"), message, "Retour à l’accueil", "index.html");
  }

  function initialiserAccueil() {
    const liste = document.getElementById("liste-questionnaires");
    const questionnaires = window.QUESTIONNAIRES || {};
    const ids = Object.keys(questionnaires);

    if (ids.length === 0) {
      afficherMessage(document.getElementById("message-accueil"), "Aucun questionnaire n’est disponible pour le moment.");
      return;
    }

    ids.forEach(function (id) {
      const config = obtenirConfig(id);
      const entree = questionnaires[id];
      if (!config || !config.arbreValide) {
        return;
      }

      const element = document.createElement("li");
      element.className = "questionnaire-item";
      const texte = document.createElement("div");
      const titre = document.createElement("h2");
      titre.textContent = entree.titre;
      const description = document.createElement("p");
      description.textContent = entree.description;
      const lien = document.createElement("a");
      lien.className = "bouton";
      lien.href = "questionnaire.html?q=" + encodeURIComponent(id);
      lien.textContent = "Commencer";
      texte.append(titre, description);
      element.append(texte, lien);
      liste.appendChild(element);
    });

    if (!liste.children.length) {
      afficherMessage(document.getElementById("message-accueil"), "Aucun questionnaire valide n’est disponible.");
    }
  }

  function initialiserQuestionnaire() {
    const config = obtenirConfig(questionnaireId);
    if (!config) {
      afficherErreurQuestionnaire("Ce questionnaire est inconnu ou sa configuration est indisponible.");
      return;
    }
    if (!config.arbreValide) {
      afficherErreurQuestionnaire("Ce questionnaire ne peut pas être affiché car son arbre contient une erreur.");
      return;
    }

    document.title = config.titre;
    document.getElementById("titre-questionnaire").textContent = config.titre;
    document.getElementById("description-questionnaire").textContent = config.description;
    const zone = document.getElementById("zone-question");
    const boutonRetour = document.getElementById("bouton-retour");
    const reponses = chargerReponses(questionnaireId);

    if (!reponses) {
      afficherErreurQuestionnaire("Les réponses enregistrées sont illisibles. Recommencez depuis l’accueil.");
      return;
    }

    const parcours = verifierParcours(config, reponses);
    if (!parcours.valide) {
      afficherErreurQuestionnaire("Les réponses enregistrées ne correspondent plus à ce questionnaire. Recommencez depuis l’accueil.");
      return;
    }
    if (parcours.termine) {
      window.location.href = "recap.html?q=" + encodeURIComponent(questionnaireId);
      return;
    }

    let questionCourante = parcours.prochaine;

    function afficherQuestion() {
      const question = config.questions[questionCourante];
      if (!question) {
        afficherErreurQuestionnaire("La question demandée est introuvable.");
        return;
      }
      document.getElementById("progression").textContent = "Question " + (reponses.length + 1);
      document.getElementById("texte-question").textContent = question.texte;
      boutonRetour.disabled = reponses.length === 0;
      zone.hidden = false;
      zone.querySelector("[data-reponse='oui']").focus();
    }

    zone.querySelectorAll("[data-reponse]").forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        const reponse = bouton.dataset.reponse;
        const noeud = config.ordre.noeuds[questionCourante];
        const suivante = noeud && noeud[reponse];
        if (typeof suivante === "undefined") {
          afficherErreurQuestionnaire("Aucune suite n’est définie pour cette réponse.");
          return;
        }

        reponses.push({ id: questionCourante, reponse: reponse });
        if (!enregistrerReponses(questionnaireId, reponses)) {
          reponses.pop();
          afficherErreurQuestionnaire("Impossible d’enregistrer vos réponses dans cette session.");
          return;
        }

        if (suivante === null) {
          window.location.href = "recap.html?q=" + encodeURIComponent(questionnaireId);
          return;
        }
        questionCourante = suivante;
        afficherQuestion();
      });
    });

    boutonRetour.addEventListener("click", function () {
      if (reponses.length === 0) {
        return;
      }
      const precedente = reponses.pop();
      questionCourante = precedente.id;
      enregistrerReponses(questionnaireId, reponses);
      afficherQuestion();
    });

    afficherQuestion();
  }

  function onVilleChoisie(ville) {
    // TODO : afficher le numéro de la mairie
  }

  function afficherRecapitulatif(config, reponses) {
    const liste = document.getElementById("liste-reponses");
    reponses.forEach(function (reponse) {
      const question = config.questions[reponse.id];
      const element = document.createElement("li");
      const titre = document.createElement("h2");
      titre.textContent = question.texte;
      const valeur = document.createElement("p");
      valeur.className = "reponse-donnee";
      valeur.textContent = "Votre réponse : " + (reponse.reponse === "oui" ? "Oui" : "Non");
      const solutions = document.createElement("ul");
      solutions.className = "solutions";
      question.solutions[reponse.reponse].forEach(function (texteSolution) {
        const solution = document.createElement("li");
        solution.textContent = texteSolution;
        solutions.appendChild(solution);
      });
      if (solutions.children.length === 0) {
        const solution = document.createElement("li");
        solution.textContent = "Aucune recommandation pour cette réponse.";
        solutions.appendChild(solution);
      }
      element.append(titre, valeur, solutions);
      liste.appendChild(element);
    });
  }

  function initialiserRecapitulatif() {
    const zoneErreur = document.getElementById("erreur-recap");
    const config = obtenirConfig(questionnaireId);
    if (!config) {
      afficherMessage(zoneErreur, "Ce questionnaire est inconnu ou sa configuration est indisponible.", "Retour à l’accueil", "index.html");
      return;
    }
    if (!config.arbreValide) {
      afficherMessage(zoneErreur, "Ce questionnaire ne peut pas être récapitulé car son arbre contient une erreur.", "Retour à l’accueil", "index.html");
      return;
    }

    const reponses = chargerReponses(questionnaireId);
    if (!reponses || reponses.length === 0) {
      afficherMessage(zoneErreur, "Aucune réponse n’a été enregistrée pour ce questionnaire.", "Retour à l’accueil", "index.html");
      return;
    }

    const parcours = verifierParcours(config, reponses);
    if (!parcours.valide || !parcours.termine) {
      afficherMessage(zoneErreur, "Ce questionnaire n’est pas terminé ou ses réponses sont invalides.", "Reprendre le questionnaire", "questionnaire.html?q=" + encodeURIComponent(questionnaireId));
      return;
    }

    document.title = "Récapitulatif : " + config.titre;
    document.getElementById("titre-recap").textContent = "Récapitulatif : " + config.titre;
    afficherRecapitulatif(config, reponses);
    document.getElementById("zone-recap").hidden = false;

    const cleVille = "questionnaire:" + questionnaireId + ":ville";
    const champVille = document.getElementById("ville");
    const messageVille = document.getElementById("ville-selectionnee");
    try {
      const villeEnregistree = window.localStorage.getItem(cleVille);
      if (villeEnregistree) {
        champVille.value = villeEnregistree;
        messageVille.textContent = "Ville sélectionnée : " + villeEnregistree;
      }
    } catch (erreur) {
      console.warn("La ville enregistrée n’a pas pu être lue.", erreur);
    }

    document.getElementById("formulaire-ville").addEventListener("submit", function (evenement) {
      evenement.preventDefault();
      const ville = champVille.value.trim();
      if (!ville) {
        champVille.focus();
        return;
      }
      try {
        window.localStorage.setItem(cleVille, ville);
        messageVille.textContent = "Ville sélectionnée : " + ville;
        onVilleChoisie(ville);
      } catch (erreur) {
        messageVille.textContent = "La ville n’a pas pu être enregistrée dans ce navigateur.";
      }
    });

    document.getElementById("bouton-recommencer").addEventListener("click", function () {
      try {
        window.sessionStorage.removeItem(cleReponses(questionnaireId));
      } catch (erreur) {
        console.warn("Les réponses de cette session n’ont pas pu être effacées.", erreur);
      }
      window.location.href = "questionnaire.html?q=" + encodeURIComponent(questionnaireId);
    });
  }

  const page = document.body.dataset.page;
  if (page === "accueil") {
    initialiserAccueil();
  } else if (page === "questionnaire") {
    initialiserQuestionnaire();
  } else if (page === "recapitulatif") {
    initialiserRecapitulatif();
  }
}());