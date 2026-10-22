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
  mp4: `/assets/reference/video/chapter-${chapter}-mobile.mp4`,
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
    kicker: "le jeux comme langage",
    period: "2004 — 2010",
    intro:
      "Né le 15 mai 1997 à Vernon, Ousmane Dembélé grandit à Évreux. C’est ici, sur les terrains du quartier et dans les salles de futsal, qu’il forge sa créativité et sa vitesse d’exécution.",
    body: [
      "Un jeune prodige qui joue avec l’audace d’un enfant et la vision d’un futur champion. À Évreux, il apprend à oser, à improviser, à créer. L’école du jeu libre. Celle qui fera toute la différence plus tard."
    ],
    accent: "#0d0d0d",
    foreground: "#fffcf5",
    typeColor: "#981616",
    navColor: "#ca2b2b",
    navActiveColor: "#fffcf5",
    clubName: "FC Évreux",
    shirtNumber: "10",
    overlay: { title: "Les premiers dribbles", subtitle: "du destin" },
    stats: [
      { value: "2004", label: "premiers pas à Évreux" },
      { value: "2009", label: "débuts en professionnel" }
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
    featureVideo: {
      mp4: "/assets/reference/video/chapter-01-jersey-data.mp4",
      poster: "/assets/reference/images/chapter-01-01.webp",
      description: "Séquences du premier chapitre",
      decorative: false
    },
    frameSequence: frame("01", "Séquence de Ballon Dor liée aux premières images"),
    mobileVideo: video("01", "Montage vidéo du premier chapitre")
  }),
  chapter({
    id: "chapter-02",
    navLabel: "Stade Rennais",
    title: "La révélation",
    kicker: "L’audace en héritage",
    period: "2010 — 2016",
    intro:
      "Arrivé à Rennes en 2010, Dembélé explose tout. En quelques mois, il passe des U19 à la Ligue 1, bousculant les défenses avec son dribble dévastateur et son sang-froid.",
    body: [
      "À seulement 18 ans, il est déjà la nouvelle pépite du football français. Son jeu est instinctif, imprévisible, électrique. Rennes découvre un joueur capable de faire lever un stade à chaque touche de balle."
    ],
    accent: "#610505",
    foreground: "#fffcf5",
    typeColor: "#0d0d0d",
    navColor: "#0d0d0d",
    navActiveColor: "#ca2b2b",
    clubName: "Stade Rennais",
    shirtNumber: "23",
    overlay: { title: "L’âge d’or", subtitle: "à Rennes" },
    stats: [
      { value: "29", label: "matchs joués" },
      { value: "12", label: "buts marqués" },
      { value: "06", label: "passes décisives" }
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
      description: "Séquences de la période rennaise",
      decorative: false
    },
    jersey: {
      src: "/assets/reference/images/jersey-rennes.webp",
      alt: "Maillot rouge et noir du chapitre rennais",
      width: 892,
      height: 858
    },
    frameSequence: frame("02", "Séquence de Ballon Dor liée au chapitre rennais"),
    mobileVideo: video("02", "Montage vidéo du deuxième chapitre")
  }),
  chapter({
    id: "chapter-03",
    navLabel: "Borussia Dortmund",
    title: "L’ascension",
    kicker: "L’appel du grand jeu",
    period: "2016 — 2017",
    intro:
      "En 2016, il traverse la frontière pour rejoindre Dortmund. Sous le maillot jaune et noir, il explose les compteurs : buts, passes décisives, gestes fous. En Allemagne, il devient une menace constante, une arme créative redoutée sur tout le continent.",
    body: [
      "À seulement 19 ans, il s’impose dans un club mythique et s’offre son premier titre majeur. Le prodige français n’est plus une promesse, il est une réalité."
    ],
    accent: "#ffd400",
    foreground: "#fffcf5",
    typeColor: "#0d0d0d",
    navColor: "#89740a",
    navActiveColor: "#141414",
    clubName: "Borussia Dortmund",
    shirtNumber: "17",
    overlay: { title: "Premiers trajets", subtitle: "dans l’élite" },
    stats: [
      { value: "42", label: "matchs joués" },
      { value: "08", label: "buts marqués" },
      { value: "18", label: "passes décisives" }
    ],
    gallery: [
      gallery("03", 1, "Joueur en maillot jaune et noir"),
      gallery("03", 2, "Joueur en maillot jaune et noir levant les bras"),
      gallery("03", 3, "Portrait du joueur en tenue de match"),
      gallery("03", 4, "Joueur sur le terrain en maillot jaune et noir")
    ],
    featureMedia: image("chapter-03-01", "Le joueur en maillot jaune et noir"),
    featureVideo: {
      mp4: "/assets/reference/video/chapter-03-feature.mp4",
      poster: "/assets/reference/images/chapter-03-01.webp",
      description: "Séquences de la saison allemande",
      decorative: false
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
    navLabel: "FC Barcelone",
    title: "La transformation",
    kicker: "Le rêve catalan",
    period: "2017 — 2023",
    intro:
      "En 2017, Ousmane Dembélé rejoint le FC Barcelone. Un rêve d’enfant, une responsabilité immense : succéder à Neymar. Entre blessures et éclairs de génie, il apprend la patience, la rigueur et la résilience.",
    body: [
      "Au contact de Messi, il affine sa lecture du jeu. À Barcelone, il comprend qu’être un artiste, c’est aussi savoir durer."
    ],
    accent: "#05192e",
    foreground: "#fffcf5",
    typeColor: "#591d20",
    navColor: "#b21a27",
    navActiveColor: "#c69653",
    clubName: "FC Barcelone",
    shirtNumber: "11",
    overlay: { title: "Le réveil", subtitle: "du Camp Nou" },
    stats: [
      { value: "185", label: "matchs joués" },
      { value: "40", label: "buts marqués" },
      { value: "42", label: "passes décisives" }
    ],
    gallery: [
      gallery("04", 1, "Joueur en maillot du FC Barcelone"),
      gallery("04", 2, "Joueur en maillot du FC Barcelone levant les bras"),
      gallery("04", 3, "Portrait du joueur en tenue de match"),
      gallery("04", 4, "Joueur sur le terrain en maillot catalan")
    ],
    featureMedia: image("chapter-04-01", "Le joueur en maillot du FC Barcelone"),
    featureVideo: {
      mp4: "/assets/reference/video/chapter-04-feature.mp4",
      poster: "/assets/reference/images/chapter-04-01.webp",
      description: "Séquences de la période catalane",
      decorative: false
    },
    jersey: {
      src: "/assets/reference/images/jersey-barca.webp",
      alt: "Maillot du FC Barcelone du chapitre catalan",
      width: 716,
      height: 623
    },
    frameSequence: frame("04", "Séquence de Ballon Dor liée au chapitre catalan"),
    mobileVideo: video("04", "Montage vidéo du quatrième chapitre")
  }),
  chapter({
    id: "chapter-05",
    navLabel: "Paris Saint Germain",
    title: "Dans la légende",
    kicker: "Briller chez soi",
    period: "2023 — 2026",
    intro:
      "En 2023, Dembélé revient en France, plus mature, plus fort. À Paris, il devient le symbole d’un football qui unit vitesse et vision. Le Parc retrouve le frisson des grands soirs.",
    body: [
      "Chaque accélération est une promesse, chaque dribble une signature. Dembélé brille enfin là où tout a commencé : sur sa terre."
    ],
    accent: "#091a34",
    foreground: "#fffcf5",
    typeColor: "#aa2221",
    navColor: "#cb1b1a",
    navActiveColor: "#fffcf5",
    clubName: "Paris Saint Germain",
    shirtNumber: "10",
    overlay: { title: "Le parcours sans réserve", subtitle: "d’expression" },
    stats: [
      { value: "102", label: "matchs joués" },
      { value: "44", label: "buts marqués" },
      { value: "15", label: "passes décisives" }
    ],
    gallery: [
      gallery("05", 1, "Joueur en maillot du Paris Saint Germain"),
      gallery("05", 2, "Joueur en maillot du Paris Saint Germain levant les bras"),
      gallery("05", 3, "Portrait du joueur en tenue de match"),
      gallery("05", 4, "Joueur sur le terrain en maillot parisien")
    ],
    featureMedia: image("chapter-05-01", "Le joueur en maillot du Paris Saint Germain"),
    featureVideo: {
      mp4: "/assets/reference/video/chapter-05-feature.mp4",
      poster: "/assets/reference/images/chapter-05-01.webp",
      description: "Séquences du retour en France",
      decorative: false
    },
    jersey: {
      src: "/assets/reference/images/jersey-psg.webp",
      alt: "Maillot du Paris Saint Germain du chapitre parisien",
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
    background: "#fffcf5",
    surface: "#0d0d0d",
    ink: "#0d0d0d",
    muted: "#818180"
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
    eyebrow: "Né pour briller",
    titleLines: ["né", "pour", "briller"],
    summary:
      "De la rue aux plus grandes scènes du football mondial, Ousmane Dembélé n’a jamais cessé d’éblouir. Un parcours fait d’instinct, de vitesse, de flair et de lumière. Voici l’histoire d’un joueur unique, tracée entre les clubs qui ont façonné sa légende.",
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
    title: "Né pour briller",
    titleLines: ["né", "pour", "briller"],
    paragraphs: [
      "De la rue aux plus grandes scènes du football mondial, Ousmane Dembélé n’a jamais cessé d’éblouir. Un parcours fait d’instinct, de vitesse, de flair et de lumière. Voici l’histoire d’un joueur unique, tracée entre les clubs qui ont façonné sa légende."
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
    hdr: "/assets/reference/hdr/theater.hdr",
    textures: [
      "/assets/reference/textures/nm0iCDZaub0a8OBl0U2ho.webp",
      "/assets/reference/textures/RpznzQ0RukGloZg52lXw2.webp",
      "/assets/reference/textures/6aXCATra7vxNOSImoUyk5.webp",
      "/assets/reference/textures/xHLRZhx6xiihQNQZVrZy8.webp",
      "/assets/reference/textures/esbtW6kLEocXqZych4GES.webp",
      "/assets/reference/textures/whqDiRcuWF4eZFpAMZ8NM.webp",
      "/assets/reference/textures/Py9gvKyhc5E4sPAImOOB2.webp",
      "/assets/reference/textures/cUHRcakE4aY2VN0SSjIs9.webp",
      "/assets/reference/textures/uBqwgD36UTj7gxGh2ysnx.webp",
      "/assets/reference/textures/S8oIXOXc6OAfxVg1E2za1.webp"
    ],
    heroParticles: 6000,
    footerParticles: 500,
    alt: "Scène 3D légère de Ballon Dor et de particules dorées",
    fallbackLabel: "Lumière et mouvement",
    accent: "#c1b28b"
  },
  footer: {
    wordmark: "Ousmane Dembélé",
    statement: "Né pour briller.",
    credits: [
      { name: "Clément Merouan", role: "Direction éditoriale" },
      { name: "Guillaume Colombel", role: "Design & motion" },
      { name: "Thomas Carré", role: "Développement" }
    ]
  }
};

validatePersonContent(content);

export const referencePerson = content;
