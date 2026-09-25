import type {
  Chapter,
  GalleryImage,
  PersonContent,
  ResponsiveImage
} from "./schema";
import { validatePersonContent } from "./schema";

const image = (
  name: string,
  alt: string,
  extension = "webp",
  width = 1470,
  height = 552
): ResponsiveImage => {
  const widths = name === "hero" || name.startsWith("chapter-")
    ? name === "chapter-05-04"
      ? [500, 800]
      : [500, 800, 1080]
    : [];
  const srcSet = widths.length
    ? widths.map((candidate) => `/assets/reference/images/${name}-p-${candidate}.${extension} ${candidate}w`).join(", ")
    : undefined;
  return {
    src: `/assets/reference/images/${name}.${extension}`,
    alt,
    width,
    height,
    sizes: "(max-width: 991px) 92vw, 42vw",
    ...(srcSet ? { srcSet } : {})
  };
};

const gallery = (
  chapter: string,
  index: number,
  alt: string,
  extension = "webp"
): GalleryImage => ({
  ...image(`chapter-${chapter}-${String(index).padStart(2, "0")}`, alt, extension),
  caption: alt
});

const frame = (chapter: string, description: string) => ({
  basePath: `/assets/reference/frames/chapter-${chapter}`,
  startFrame: 40,
  frameCount: 152,
  extension: "webp",
  poster: `/assets/reference/images/chapter-${chapter}-01.webp`,
  width: 1200,
  height: 1200,
  posterWidth: 1470,
  posterHeight: 552,
  description
});

const video = (chapter: string, description: string) => ({
  webm: `/assets/reference/video/chapter-${chapter}.webm`,
  poster: `/assets/reference/images/chapter-${chapter}-01.webp`,
  description,
  decorative: false
});

const chapter = (value: Chapter): Chapter => value;

const chapters: Chapter[] = [
  chapter({
    id: "chapter-01",
    navLabel: "Évreux",
    title: "Les racines",
    kicker: "Le jeu comme langage",
    period: "2004 — 2010",
    intro:
      "Né à Vernon et grandi à Évreux, Ousmane Dembélé transforme les terrains de quartier en laboratoire d’audace. La vitesse, l’improvisation et le plaisir de dribler dessinent déjà une signature.",
    body: [
      "Entre futsal, pelouses et terrains à sept, il apprend à enjamber les lignes. Le jeu devient un langage avant de devenir un métier.",
      "Cette liberté nourrit la confiance qui accompagnera toutes les étapes suivantes : oser, puis accélérer."
    ],
    accent: "#b91f26",
    foreground: "#fff8ed",
    stats: [
      { value: "1997", label: "année de naissance" },
      { value: "2004", label: "premiers pas à Évreux" }
    ],
    gallery: [
      gallery("01", 1, "Jeune joueur en maillot rouge et noir, la main sur le front"),
      gallery("01", 2, "Joueur en maillot rouge et noir levant les bras"),
      gallery("01", 3, "Portrait de jeunesse en salle de sport"),
      gallery("01", 4, "Joueur posé devant un rideau rouge et noir")
    ],
    featureMedia: image("chapter-01-01", "Portrait du joueur au début de sa carrière"),
    jersey: {
      src: "/assets/reference/images/jersey-evreux.webp",
      alt: "Maillot rouge et noir du premier chapitre",
      width: 892,
      height: 858
    },
    frameSequence: frame("01", "Séquence de Ballon Dor liée aux premières images"),
    mobileVideo: video("01", "Montage vidéo du premier chapitre")
  }),
  chapter({
    id: "chapter-02",
    navLabel: "Rennes",
    title: "La révélation",
    kicker: "L’audace en héritage",
    period: "2010 — 2016",
    intro:
      "À Rennes, le prodige devient professionnel. Déboussolant les défenses par ses changements de direction, il associe une élégance rare à une vitesse déjà spectaculaire.",
    body: [
      "Le jeune attaquant impose une identité : le dribble n’est pas une fin, mais le moyen de créer le décalage.",
      "En quelques mois, il passe des Espoirs à Ligue 1 et installe son nom dans le paysage du football français."
    ],
    accent: "#171717",
    foreground: "#ff6b6b",
    stats: [
      { value: "29", label: "matches en Rouge et Noir" },
      { value: "12", label: "buts en Ligue 1" }
    ],
    gallery: [
      gallery("02", 1, "Joueur en maillot rouge et noir fêtant une victoire"),
      gallery("02", 2, "Joueur en maillot rouge et noir levant les bras"),
      gallery("02", 3, "Portrait du joueur en tenue de match"),
      gallery("02", 4, "Joueur en maillot rouge et noir regardant vers le terrain")
    ],
    featureMedia: image("chapter-02-01", "Le joueur en maillot rouge et noir"),
    featureVideo: {
      mp4: "/assets/reference/video/chapter-02-feature.mp4",
      poster: "/assets/reference/images/chapter-02-01.webp",
      description: "Séquence vidéo du chapitre rennais",
      transcript: "Images de match et de célébration du joueur en maillot rouge et noir.",
      decorative: true
    },
    frameSequence: frame("02", "Séquence de Ballon Dor liée au chapitre rennais"),
    mobileVideo: video("02", "Montage vidéo du deuxième chapitre")
  }),
  chapter({
    id: "chapter-03",
    navLabel: "Dortmund",
    title: "L’ascension",
    kicker: "L’appel du grand jeu",
    period: "2016 — 2017",
    intro:
      "La Bundesliga accélère le récit. À Dortmund, Dembélé joue vite, attaque les espaces et impresse immédiatement une Europe attentive à ses gestes.",
    body: [
      "Il découvre un football plus rapide, plus physique et plus exigeant. Ses statistiques deviennent rapidement remarquables.",
      "Un premier titre majeur et une nouvelle réputation : celle d’un joueur capable de déstabiliser un match entier."
    ],
    accent: "#f2d51d",
    foreground: "#151515",
    stats: [
      { value: "42", label: "matches en Bundesliga" },
      { value: "10", label: "buts toutes compétitions" }
    ],
    gallery: [
      gallery("03", 1, "Joueur en maillot jaune et noir les bras levés"),
      gallery("03", 2, "Joueur en maillot jaune frappe le ballon"),
      gallery("03", 3, "Joueur en maillot jaune reçoit un trophée"),
      gallery("03", 4, "Joueur en maillot jaune avec une grande coupe")
    ],
    featureMedia: image("chapter-03-01", "Le joueur en maillot jaune et noir"),
    featureVideo: {
      mp4: "/assets/reference/video/chapter-03-feature.mp4",
      poster: "/assets/reference/images/chapter-03-01.webp",
      description: "Séquence vidéo du chapitre allemand",
      transcript: "Images de match, de titre et de célébration en maillot jaune et noir.",
      decorative: true
    },
    jersey: {
      src: "/assets/reference/images/jersey-dortmund.webp",
      alt: "Maillot jaune et noir du chapitre allemand",
      width: 594,
      height: 582
    },
    frameSequence: frame("03", "Séquence de Ballon Dor liée au chapitre allemand"),
    mobileVideo: video("03", "Montage vidéo du troisième chapitre")
  }),
  chapter({
    id: "chapter-04",
    navLabel: "Barcelone",
    title: "La transformation",
    kicker: "Le rêve catalan",
    period: "2017 — 2023",
    intro:
      "Le FC Barcelone ouvre un nouveau chapitre. Entre blessures, progrès et moments de pur génie, le joueur apprend aussi la constance.",
    body: [
      "À Barcelone, l’individualité se confronte aux exigences du plus grand projet sportif collectif.",
      "Chaque retour renforce la confiance. Le jeu devient plus complet, plus patient et toujours plus spontané."
    ],
    accent: "#951d2b",
    foreground: "#e8bf65",
    stats: [
      { value: "185", label: "matches sous le maillot blaugrana" },
      { value: "40", label: "buts toutes compétitions" }
    ],
    gallery: [
      gallery("04", 1, "Joueur en maillot bleu et rouge après une action"),
      gallery("04", 2, "Joueur en maillot bleu et rouge en plein saut"),
      gallery("04", 3, "Joueur en maillot bleu et rouge célébrant"),
      gallery("04", 4, "Joueur en maillot bleu et rouge sous les projecteurs")
    ],
    featureMedia: image("chapter-04-01", "Le joueur en maillot bleu et rouge"),
    featureVideo: {
      mp4: "/assets/reference/video/chapter-04-feature.mp4",
      poster: "/assets/reference/images/chapter-04-01.webp",
      description: "Séquence vidéo du chapitre catalan",
      transcript: "Images de match et de célébration du joueur en maillot bleu et rouge.",
      decorative: true
    },
    jersey: {
      src: "/assets/reference/images/jersey-barca.webp",
      alt: "Maillot bleu et rouge du chapitre catalan",
      width: 716,
      height: 623
    },
    frameSequence: frame("04", "Séquence de Ballon Dor liée au chapitre catalan"),
    mobileVideo: video("04", "Montage vidéo du quatrième chapitre")
  }),
  chapter({
    id: "chapter-05",
    navLabel: "Paris",
    title: "Dans la légende",
    kicker: "Briller chez soi",
    period: "2023 — aujourd’hui",
    intro:
      "Le retour en France transforme le parcours en boucle lumineuse. À Paris, la vitesse et la vision trouvent un terrain de jeu pour durer, et un public qui reconnaît enfin la puissance d’un style.",
    body: [
      "Le numéro 10 associe l’insoumission de la rue, l’exigence de la plus grande scène et une identité devenue évidente.",
      "L’odyssée n’est plus une collection d’étapes, mais une trajectoire qui continue d’écrire."
    ],
    accent: "#c52233",
    foreground: "#fff8ed",
    stats: [
      { value: "2023", label: "retour en France" },
      { value: "2025", label: "Ballon d’Or" }
    ],
    gallery: [
      gallery("05", 1, "Joueur en maillot bleu criant après une action"),
      gallery("05", 2, "Joueur en maillot bleu, numéro 10, les bras ouverts"),
      gallery("05", 3, "Joueur en maillot bleu tenant un trophée"),
      gallery("05", 4, "Joueur en maillot bleu avec la Ligue des champions", "avif")
    ],
    featureMedia: image("chapter-05-01", "Le joueur en maillot bleu face au public"),
    featureVideo: {
      mp4: "/assets/reference/video/chapter-05-feature.mp4",
      poster: "/assets/reference/images/chapter-05-01.webp",
      description: "Séquence vidéo du chapitre parisien",
      transcript: "Images de match et de célébration du joueur en maillot bleu.",
      decorative: true
    },
    jersey: {
      src: "/assets/reference/images/jersey-psg.webp",
      alt: "Maillot bleu du chapitre parisien",
      width: 481,
      height: 507
    },
    frameSequence: frame("05", "Séquence de Ballon Dor liée au chapitre parisien"),
    mobileVideo: video("05", "Montage vidéo du cinquième chapitre")
  })
];

const content: PersonContent = {
  slug: "ousmane-dembele",
  language: "fr",
  name: "Ousmane Dembélé",
  role: "Footballeur professionnel",
  seoDescription:
    "De la rue aux plus grandes scènes du football mondial, découvrez le parcours, la vitesse et la lumière d’Ousmane Dembélé.",
  theme: {
    background: "#f0ede4",
    surface: "#151515",
    ink: "#151515",
    muted: "#736e64"
  },
  labels: {
    skip: "Aller au contenu",
    navigation: "Navigation principale",
    chapters: "Chapitres",
    introduction: "Introduction",
    gallery: "Galerie",
    statistics: "Statistiques",
    feature: "Le chapitre en images",
    play: "Lire la vidéo",
    pause: "Mettre la vidéo en pause",
    audioUnavailable: "Audio indisponible",
    footer: "Fin du parcours",
    sceneFallback: "Une composition statique reste disponible"
  },
  hero: {
    eyebrow: "Une histoire de mouvement",
    titleLines: ["Ne", "pour", "briller"],
    summary:
      "De la rue aux plus grandes scènes du football mondial, un parcours fait d’instinct, de vitesse, de flair et de lumière.",
    image: image(
      "hero",
      "Portrait graphique associé au parcours d’Ousmane Dembélé",
      "avif",
      1536,
      1024
    ),
    scrollLabel: "Découvrir le parcours"
  },
  intro: {
    eyebrow: "Le parcours",
    title: "Du premier geste au plus grand stade.",
    paragraphs: [
      "Ousmane Dembélé n’a jamais cessé d’éblouir. Cet hommage suit les étapes, les images et les gestes qui ont construit sa légende.",
      "Cinq chapitres. Cinq couleurs. Une même fascination pour la liberté, la vitesse et la lumière."
    ],
    gallery: [
      {
        ...image("end-01", "Composition graphique claire aux reflets dorés", "webp", 1674, 970),
        caption: "Lumière"
      },
      {
        ...image("end-02", "Composition graphique sombre aux reflets rouges", "webp", 1674, 970),
        caption: "Énergie"
      },
      {
        ...image("end-03", "Composition graphique aux formes lumineuses", "webp", 1674, 970),
        caption: "Mouvement"
      }
    ]
  },
  chapters,
  audio: {
    src: "/assets/reference/audio/hold-to-play.mp3",
    label: "Écouter l’ambiance sonore",
    holdLabel: "Maintenir pour écouter",
    description:
      "Maintenez le bouton pour écouter une ambiance courte. Relâchez pour arrêter. Le son ne démarre jamais automatiquement.",
    transcript:
      "Ambiance sonore de vent sans paroles, prévue pour une écoute courte et facultative."
  },
  scene: {
    model: "/assets/reference/models/ballondor.glb",
    alt: "Scène 3D légère de Ballon Dor et de particules dorées",
    fallbackLabel: "Lumière et mouvement",
    accent: "#c6a15b"
  },
  footer: {
    wordmark: "Ousmane Dembélé",
    statement: "Né pour briller.",
    credits: [
      { name: "Ankhi", role: "Direction éditoriale" },
      { name: "Ankhi", role: "Design & motion" },
      { name: "Ankhi", role: "Développement" }
    ]
  }
};

validatePersonContent(content);

export const referencePerson = content;
