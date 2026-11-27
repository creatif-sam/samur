import type { HelpTopic } from '@/lib/help'

// The ⓘ explanations in French ("tu"). Every topic in lib/help.ts must be here:
// TypeScript reports a missing one. Same rules: short, plain, no dashes, ends with a full stop.
export const HELP_FR: Record<HelpTopic, { title: string; text: string }> = {
  // ── Accueil ──
  'home.today': { title: "Aujourd'hui", text: 'Ta journée en un coup d’œil. Touche une icône de rythme pour faire cette habitude ; chaque jour où tu la fais allonge sa série. « À venir » liste ce que tu as prévu plus tard.' },
  'home.gratitude': { title: 'Gratitude du jour', text: 'Écris chaque jour trois choses pour lesquelles tu es reconnaissant. Tes entrées passées sont listées dessous pour que tu puisses les relire.' },
  'home.checkin': { title: 'Bilan de la semaine', text: 'Un court mot hebdomadaire pour ton partenaire : victoires, difficultés et sujets de prière. Tu peux lire le sien une fois le tien partagé.' },
  'home.countdown': { title: 'Objectifs à venir', text: 'Un compte à rebours vers tes prochains objectifs. Il passe à l’orange sous trois jours et au rouge en cas de retard. Touche un objectif pour l’ouvrir.' },
  'home.dailyVerse': { title: 'Pain quotidien', text: 'Un verset pour commencer ta journée. Touche l’icône de copie pour le copier.' },

  // ── Boussole ──
  'goals.page': { title: 'Objectifs et rôles', text: 'Commence en gardant la fin à l’esprit. Liste les rôles que tu vis, donne à chacun une mission et une vision, et fixe des objectifs dessous. Puis donne la priorité à l’essentiel : planifie chaque semaine autour de tes gros cailloux.' },
  'goals.roles': { title: 'Rôles', text: 'Un rôle est une part de ta vie dont tu es responsable, comme parent ou professionnel. Regroupe tes rôles par catégories, donne à chacun une mission et une vision, et ajoute les objectifs qui le servent.' },
  'goals.unassigned': { title: 'Non classés', text: 'Les objectifs sans rôle, groupés par leur ancienne vision. Utilise Déplacer pour classer un objectif, ou Tout déplacer pour classer un groupe entier sous le rôle qu’il sert.' },
  'goals.week': { title: 'Ta semaine', text: 'Choisis un ou deux gros cailloux par rôle. Indique combien de séances il faut, comme 3 pour Courir trois fois. Réserve du temps avec l’icône calendrier ; cocher les séances dans l’agenda termine le caillou.' },
  'goals.life': { title: 'Mission et vision de vie', text: 'Ta mission dit pourquoi tu existes et comment tu le vis, au présent. Ta vision décrit l’avenir que tu construis. Garde les deux assez courtes pour t’en souvenir ; chaque rôle et chaque objectif en découlent.' },
  'goals.focus': { title: 'Rôle ciblé', text: 'Choisis un rôle pour ne voir que ses objectifs sur cette page, ou affiche-les tous. Non classés montre tes objectifs sans rôle.' },
  'goals.attention': { title: 'À surveiller', text: 'Les objectifs qui ont besoin d’un coup de pouce : en retard, bloqués ou à rendre dans les 7 jours. Touche-en un pour l’ouvrir.' },
  'goals.momentum': { title: 'Élan', text: 'Combien d’objectifs arrivent à échéance sur la période choisie et combien sont faits, avec un graphique des terminés et des ouverts.' },
  'goals.byRole': { title: 'Par rôle', text: 'Les objectifs à rendre sur la période choisie, groupés par le rôle qu’ils servent, avec le nombre de faits dans chacun. Les objectifs partagés par ton partenaire ont leur propre ligne.' },
  'goals.overviewRoles': { title: 'Tes rôles', text: 'Chaque rôle avec la progression de ses objectifs. Un rôle sans objectif ressort, pour qu’aucune part de ta vie ne soit oubliée. Touche un rôle pour ouvrir l’onglet Rôles.' },
  'goals.list': { title: 'Tes objectifs', text: 'Les objectifs à rendre sur la période choisie. Les objectifs en retard et non faits restent visibles. Touche un objectif pour l’ouvrir, et le bouton + pour en ajouter un.' },
  'goals.visions': { title: 'Visions', text: 'Une vision est un grand tableau à long terme. Lie-lui des objectifs et sa progression est leur moyenne. Touche une carte pour voir ses objectifs ; le menu ⋯ la modifie, l’archive ou la supprime.' },
  'goals.visionYear': { title: 'Visions de l’année', text: 'Les visions de cette année, face au temps déjà écoulé. La frise des mois montre les mois passés, et un point signale une vision à rendre ce mois-là.' },
  'goals.pace': { title: 'Rythme', text: 'Compare ta progression avec celle d’un rythme régulier aujourd’hui. En avance signifie 10 points ou plus devant, En retard plus de 10 derrière, et Dépassé que la date est passée.' },
  'goals.track': { title: 'Suivre', text: 'Change le statut, règle la progression par paliers, découpe l’objectif en étapes, ou réserve du temps dans ton agenda. Avec des étapes, les cocher fait avancer la progression.' },

  // ── Agenda ──
  'planner.page': { title: 'Agenda du jour', text: 'Planifie ta journée dans Temps, ou suis ton argent dans Argent. Passe de Jour à Semaine ou Mois en haut. Dans l’horaire, maintiens un événement pour le déplacer, ou tire son bord du bas pour changer sa durée.' },
  'planner.intention': { title: 'Intention du matin', text: 'Écris la chose sur laquelle tu veux te concentrer aujourd’hui. Elle s’enregistre toute seule.' },
  'planner.reflection': { title: 'Réflexion du soir', text: 'Note comment s’est passée la journée. Elle s’enregistre toute seule et apparaît dans ton bilan de la semaine.' },
  'planner.summary': { title: 'Résumé du jour', text: 'La carte ci-dessus montre les événements faits, prévus et le temps libre restant, avec une suggestion. Partager mon temps libre envoie tes créneaux à un ami.' },
  'planner.mood': { title: 'Humeur', text: 'Touche le visage pour dire comment tu te sens aujourd’hui. C’est enregistré avec la journée et change les couleurs de l’agenda et le verset affiché.' },
  'planner.todos': { title: 'Tâches', text: 'Les choses à faire qui n’ont pas encore d’heure. Touche Planifier sur l’une d’elles pour lui donner un créneau dans ta journée.' },
  'planner.top3': { title: 'Top 3', text: 'Choisis les trois choses qui comptent le plus aujourd’hui. Écris-les, ou touche une suggestion parmi tes gros cailloux et tes événements. Coche-les ce soir dans la carte Réflexion du soir.' },
  'planner.rocks': { title: 'Gros cailloux', text: 'Les gros cailloux choisis cette semaine dans Boussole qui n’ont pas encore de temps réservé. Place-les d’abord dans tes journées, comme l’enseigne Covey. Déjà fait ? Coche son cercle.' },
  'planner.week': { title: 'Ta semaine', text: 'Le temps prévu par rôle, où en sont tes gros cailloux, et les événements de chaque jour, avec les chevauchements signalés. Touche un jour pour l’ouvrir, ou maintiens un événement et glisse-le sur un autre jour.' },
  'planner.quickadd': { title: 'Ajout rapide', text: 'Écris un événement en une ligne, comme Sport demain 7h 1h ou Réunion demain 9h à 10h. Sans heure, il va dans ton prochain créneau libre.' },
  'planner.wrapup': { title: 'Clôturer la journée', text: 'Avant de dormir, déplace les événements non faits à demain, reporte ton Top 3 inachevé et écris une ligne sur ta journée. Chaque ligne se coche toute seule une fois faite.' },
  'planner.partnerweek': { title: 'Sa semaine', text: 'Les gros cailloux de ton partenaire et les événements qu’il partage avec toi. Touche l’applaudissement sur ce qu’il a terminé pour l’encourager ; il reçoit une notification.' },
  'planner.money': { title: 'Argent', text: 'Journal enregistre les entrées et sorties, Graphiques montre où va l’argent, et Budget fixe des limites par catégorie. Touche + pour ajouter une entrée.' },

  // ── Notes ──
  'notes.library': { title: 'Bibliothèque de notes', text: 'Tes carnets sont ici. Ouvre-en un pour voir ses sections et ses pages. Tes notes de lecture biblique, de journal et de prière sont rangées pour toi dans leurs propres carnets. Épingle carnets ou notes pour les garder en haut.' },
  'notes.editor': { title: 'Écrire une note', text: 'Ta note s’enregistre toute seule. Le menu ⋯ peut l’épingler, la partager avec ton partenaire, la déplacer, transformer une liste en tâches d’agenda, ou l’exporter.' },

  // ── Lecture ──
  'reading.page': { title: 'Bibliothèque', text: 'Lire suit tes livres et tes pages. Quiz sert à te tester en vrai ou faux. Créer enregistre des sessions de travail concentré.' },
  'reading.library': { title: 'Ta bibliothèque', text: 'Ajoute les livres que tu lis et note tes pages avec une courte note sur ta lecture ; les pages ne comptent qu’avec une note. Touche un statut pour filtrer, et le calendrier montre tes jours de lecture.' },
  'reading.quiz': { title: 'Quiz', text: 'Crée un quiz de questions vrai ou faux, passe-le pour te tester, et retrouve tes essais dans Historique.' },
  'reading.create': { title: 'Sessions de travail', text: 'Touche Démarrer en commençant et Arrêter en finissant, ou ajoute une session passée. Dis sur quoi tu as travaillé et ce que cela a produit. Cette carte montre ta semaine, et tes sessions sont listées dessous.' },

  // ── Bible ──
  'bible.books': { title: 'Bible', text: 'Choisis un livre à lire. Rechercher trouve des passages ou des mots, Enregistrés garde tes versets, Plans propose des plans de lecture, et la tuile de version change de traduction.' },
  'bible.read': { title: 'Lecture', text: 'Touche un verset pour le sélectionner, et d’autres pour en ajouter. Puis copie, partage, enregistre, surligne, ajoute une note ou compare les traductions. Une icône de note à côté d’un verset ouvre ta note.' },
  'bible.compare': { title: 'Comparer les versions', text: 'Lis les mêmes versets dans plusieurs traductions côte à côte. Ajoute ou retire des traductions ; ton choix est retenu.' },
  'bible.plans': { title: 'Plans de lecture', text: 'Suis un plan jour après jour et marque chaque jour comme fait. Si tu prends du retard, tu vois de combien, et tu vois la progression de ton partenaire sur le même plan.' },

  // ── Esprit ──
  'spirit.meditations': { title: 'Méditations', text: 'Écris ce que Dieu te montre. Fais-le chaque jour pour allonger ta série. Ton verset à mémoriser et les méditations de ton partenaire apparaissent aussi ici.' },
  'spirit.prayer': { title: 'Prière', text: 'Lance le minuteur et prie. Chaque session terminée est enregistrée dans le calendrier. Passe à Graphique pour voir tes minutes grimper, et fixe un objectif quotidien pour le mois.' },
  'spirit.posts': { title: 'Publications', text: 'Partage un sujet de prière, un merci ou ce que Dieu t’a montré, avec ton partenaire ou juste pour toi. Ajoute jusqu’à quatre photos avec le bouton image. Touche « J’ai prié » sur un sujet pour te tenir à ses côtés.' },
  'spirit.streak': { title: 'Série de méditations', text: 'Écris une méditation chaque jour pour allonger ta série. Un jour manqué la fait recommencer. Ouvre le calendrier pour voir chaque jour ; 😈 marque les jours manqués.' },
  'spirit.memoryVerse': { title: 'Verset à mémoriser', text: 'Choisis un verset à apprendre par cœur, exerce-toi et marque-le comme mémorisé. Les versets mémorisés reviennent plus tard en révision pour que tu les gardes.' },
  'spirit.partnerStreaks': { title: 'Séries en duo', text: 'Ta série de méditations à côté de celle de ton partenaire. Écris une méditation aujourd’hui pour garder la tienne.' },
  'spirit.journal': { title: 'Ton journal', text: 'Tes méditations, des plus récentes aux plus anciennes, groupées par mois. Recherche-les, filtre par Moi, mon partenaire, Partagées ou Privées, et touche-en une pour la lire.' },
  'prayer.timer': { title: 'Minuteur de prière', text: 'Choisis combien de temps tu veux prier et appuie sur Démarrer. Une session terminée est enregistrée dans ton calendrier et ton partenaire est prévenu. Les inspirations notées pendant la prière vont dans tes Notes.' },
  'prayer.target': { title: 'Objectif de prière quotidien', text: 'Choisis combien de minutes tu veux prier chaque jour ce mois-ci. La ligne verte en gras le montre sur le graphique, et un jour devient vert dans le calendrier quand tu l’atteins. Chaque mois garde son objectif.' },
  'prayer.requests': { title: 'Sujets de prière', text: 'Liste ce pour quoi tu pries, avec un verset de promesse si tu veux. Partage un sujet et ton partenaire peut prier pour lui aussi. Quand Dieu répond, marque-le exaucé ; il rejoint tes témoignages.' },
  'prayer.partner': { title: 'Prier pour ton partenaire', text: 'Les sujets que ton partenaire partage avec toi. Prie pour l’un d’eux, ou inclus-les dans Prier pour tous ; ton partenaire est prévenu que tu as prié.' },
  'prayer.reminders': { title: 'Heures de prière', text: 'Choisis jusqu’à cinq heures par jour pour prier. Une notification arrive à chacune, dans ton fuseau horaire, même pendant les heures calmes.' },
  'prayer.diary': { title: 'Journal de prière', text: 'Écris ce que tu pries et entends, et ajoute des points de prière à cocher en priant. Les entrées sont enregistrées comme notes dans ton carnet Journal de prière.' },
  'prayer.guided': { title: 'Session de prière', text: 'Choisis tes minutes et les sujets à inclure, et le temps est partagé équitablement. Chaque sujet s’affiche en carte avec son propre compte à rebours. Ton temps est enregistré dans le calendrier, et tu peux ajouter la session à ton journal.' },
  'prayer.partnerStreaks': { title: 'Séries de prière', text: 'Combien de jours d’affilée toi et ton partenaire avez prié. Prie aujourd’hui pour garder ta série.' },
  'posts.feed': { title: 'Tes publications', text: 'Filtre par auteur ou par type, recherche et actualise. Les sujets de prière ont un bouton « J’ai prié », et leur auteur peut les marquer exaucés depuis le menu ⋯. Un badge violet signale du nouveau depuis ta dernière visite.' },

  // ── Statistiques ──
  'analytics.page': { title: 'Statistiques', text: 'Un regard sur ta croissance : série de méditations, objectifs atteints, livres lus, répartition de tes objectifs, et comment ton temps prévu se partage entre tes rôles.' },
  'analytics.visionTime': { title: 'Temps par rôle', text: 'Additionne les heures prévues selon le rôle de chaque événement, pour voir si chaque rôle reçoit du temps. Choisis un rôle en créant un événement. Les anciens événements sont listés par vision.' },
  'review.roles': { title: 'Tes rôles cette semaine', text: 'Le temps prévu par rôle cette semaine, et les gros cailloux terminés. Un rôle sans temps est un signe de le prévoir pour la semaine qui vient, plus bas.' },
  'review.page': { title: 'Bilan de la semaine', text: 'Ta semaine en un coup d’œil : objectifs, méditations, tâches faites, argent, temps de prière et versets, plus tes réflexions du soir. Sers-t’en pour choisir quoi améliorer la semaine prochaine.' },
  'notifications.page': { title: 'Notifications', text: 'Tout ce qui t’a été envoyé, du plus récent au plus ancien : l’activité de ton partenaire, des rappels et des encouragements. Touche-en une pour l’ouvrir. Filtre par Toutes ou Non lues, et la roue choisit ce que tu reçois.' },

  // ── Profil ──
  'profile.partner': { title: 'Partenaire de redevabilité', text: 'Relie-toi à une personne de confiance en invitant son e-mail. Une fois connectés, vous pouvez partager objectifs, notes, publications et bilans, et voir vos séries. Tu peux te déconnecter à tout moment.' },
  'profile.currency': { title: 'Devise', text: 'La devise utilisée pour les montants de ton agenda Argent.' },
  'profile.businessCard': { title: 'Carte de visite', text: 'Crée une carte de visite numérique avec un code QR. Partage son lien, ou laisse quelqu’un scanner le code, pour montrer tes coordonnées.' },
  'profile.notifications': { title: 'Notifications', text: 'Choisis de quoi tu es informé, active les alertes sur ce téléphone, fixe des heures calmes, et envoie-toi un aperçu du résumé du dimanche par e-mail.' },
  'profile.deleteData': { title: 'Supprimer certaines données', text: 'Supprime définitivement un type de données que tu choisis, comme les objectifs ou les méditations, et garde ton compte. Action irréversible.' },
  'profile.themes': { title: 'Thèmes de l’année et du mois', text: 'Ta parole et ton verset pour l’année. Un thème d’année peut commencer avant janvier : indique le jour où tu as commencé à le vivre. Le thème du mois ne s’affiche que pendant son mois.' },
}
