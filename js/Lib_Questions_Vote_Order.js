window.LIB_QUESTIONS_VOTE_ORDER = {
  depart: "q_inscrit",
  noeuds: {
    q_inscrit: { oui: "q_present", non: "q_majeur" },
    q_majeur: { oui: null, non: null },
    q_present: { oui: null, non: "q_procuration" },
    q_procuration: { oui: null, non: null }
  }
};