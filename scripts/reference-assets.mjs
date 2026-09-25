import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(currentDirectory, "..");
export const referenceRoot = resolve(projectRoot, "public/assets/reference");

const webflow = "https://cdn.prod.website-files.com/68eacc9cfb61962851d25f24";
const frames = "https://pub-dcea4cdd170646d8871f093707ad23d1.r2.dev";
const flowdrive = "https://4zzUDPDVTR.flowdrivecdn.com";
const flowdriveJ = "https://jcz25Fazaz.flowdrivecdn.com";

const image = (id, filename, sourceUrl) => ({
  id,
  sourceUrl,
  category: "image",
  localPath: `/assets/reference/images/${filename}`,
  rightsStatus: "reference-only"
});

const font = (id, filename, sourceUrl) => ({
  id,
  sourceUrl,
  category: "font",
  localPath: `/assets/reference/fonts/${filename}`,
  rightsStatus: "reference-only"
});

const video = (id, filename, sourceUrl) => ({
  id,
  sourceUrl,
  category: "video",
  localPath: `/assets/reference/video/${filename}`,
  rightsStatus: "reference-only"
});

const model = (id, filename, sourceUrl) => ({
  id,
  sourceUrl,
  category: "model",
  localPath: `/assets/reference/models/${filename}`,
  rightsStatus: "reference-only"
});

const hdr = (id, filename, sourceUrl) => ({
  id,
  sourceUrl,
  category: "hdr",
  localPath: `/assets/reference/hdr/${filename}`,
  rightsStatus: "reference-only"
});

const texture = (id, filename, sourceUrl) => ({
  id,
  sourceUrl,
  category: "texture",
  localPath: `/assets/reference/textures/${filename}`,
  rightsStatus: "reference-only"
});

const chapterSources = [
  {
    chapter: "01",
    slug: "evreux",
    prefix: "Evreux",
    extension: "webp",
    ids: [
      "6903aadb2c78d0f2f8f57a9e",
      "6903aadb7848eae6412ee387",
      "6903aadb680cdcef63ef113e",
      "6903aadb202dddc46005f8a4"
    ]
  },
  {
    chapter: "02",
    slug: "rennes",
    prefix: "Rennes",
    extension: "webp",
    ids: [
      "6903bcc70e2b908f4ee9adde",
      "6903bcc7367fbeab0c5684fd",
      "6903bcc7c6d527acfd47c3d6",
      "6903bcc7b2c7b6580257a2df"
    ]
  },
  {
    chapter: "03",
    slug: "dortmund",
    prefix: "BVB",
    extension: "webp",
    ids: [
      "6903bee638aa36f60a14d8d2",
      "6903bee61864863dbe8a4ac8",
      "6903bee6ea06a51a1917904f",
      "6903bee635d58c313a25e386"
    ]
  },
  {
    chapter: "04",
    slug: "fcb",
    prefix: "FCB",
    extension: "webp",
    ids: [
      "6903c1527b4af3c132b0af92",
      "6903c153bd5e12669b95fe56",
      "6903c15323090b4a1bda1d86",
      "6903c155b2c7b6580258ff0c"
    ]
  },
  {
    chapter: "05",
    slug: "psg",
    prefix: "PSG",
    extension: "webp",
    ids: [
      "6903cb42ac8cab63abeb13c2",
      "6903cb4258b0b6946b515bbd",
      "6903cb42191d17daa82c5a8f",
      "6903cb42b1c35fffb40fc098"
    ]
  }
];

const responsiveImages = chapterSources.flatMap(({ chapter, prefix, extension, ids }) =>
  ids.flatMap((assetId, index) => {
    const sourceBase = `${webflow}/${assetId}_${prefix}-${index + 1}`;
    const localBase = `chapter-${chapter}-${String(index + 1).padStart(2, "0")}`;
    const actualExtension = chapter === "05" && index === 3 ? "avif" : extension;
    const variants = [
      ["original", ""],
      ["500", "-p-500"],
      ["800", "-p-800"],
      ...(chapter === "05" && index === 3 ? [] : [["1080", "-p-1080"]])
    ];
    return variants.map(([variant, suffix]) =>
      image(
        `${localBase}-${variant}`,
        `${localBase}${suffix}.${actualExtension}`,
        `${sourceBase}${suffix}.${actualExtension}`
      )
    );
  })
);

const fonts = [
  ["font-pp-neue-montreal-medium", "PPNeueMontreal-Medium.woff2", "68eacc9cfb61962851d25f27_PPNeueMontreal-Medium.woff2"],
  ["font-pp-neue-montreal-semibold", "PPNeueMontreal-SemiBold.woff2", "68eacc9cfb61962851d25f2d_PPNeueMontreal-SemiBold.woff2"],
  ["font-pp-neue-montreal-regular", "PPNeueMontreal-Regular.woff2", "68eacc9cfb61962851d25f28_PPNeueMontreal-Regular.woff2"],
  ["font-network-free", "NetworkFreeVersion.ttf", "68eaee6a7bcf3ee7d04805bf_NetworkFreeVersion.ttf"],
  ["font-being-black", "Being-Black.otf", "68eaedf10a31780da57a88cb_Being-Black.otf"],
  ["font-being-inktraps", "Being-BlackInktraps.otf", "68eaedf10d1e900673b57b4c_Being-BlackInktraps.otf"],
  ["font-doner-extrabold", "Doner-ExtraBoldText.otf", "68eaee30596b34c27f7039a6_Doner-ExtraBoldText.otf"],
  ["font-doner-bold", "Doner-BoldText.otf", "68eaee3052a84c0eca81c486_Doner-BoldText.otf"],
  ["font-doner-medium", "Doner-MediumText.otf", "68eaee30d6b76cc1eccc33a5_Doner-MediumText.otf"],
  ["font-doner-black", "Doner-BlackText.otf", "68eaee30d055bcdaffddc9a8_Doner-BlackText.otf"],
  ["font-doner-extralight", "Doner-ExtraLightText.otf", "68eaee3003f05ee9228e375f_Doner-ExtraLightText.otf"]
].map(([id, filename, source]) => font(id, filename, `${webflow}/${source}`));

const endFrames = [
  ["01", "nm0iCDZaub0a8OBl0U2ho"],
  ["02", "RpznzQ0RukGloZg52lXw2"],
  ["03", "6aXCATra7vxNOSImoUyk5"],
  ["04", "xHLRZhx6xiihQNQZVrZy8"],
  ["05", "esbtW6kLEocXqZych4GES"],
  ["06", "whqDiRcuWF4eZFpAMZ8NM"],
  ["07", "Py9gvKyhc5E4sPAImOOB2"],
  ["08", "cUHRcakE4aY2VN0SSjIs9"],
  ["09", "uBqwgD36UTj7gxGh2ysnx"],
  ["10", "S8oIXOXc6OAfxVg1E2za1"]
].map(([index, source]) => image(`end-${index}`, `end-${index}.webp`, `${flowdriveJ}/${source}`));

const videoCatalog = [
  ["01", "y9wOHvVZepzuQxVU4WTfF", "oQMZzkveK6HVSXoYdZUZU", "M2Il0G7akywTYE9Il6JR9", ""],
  ["02", "1RIr6VvW2mja4u66Tjome", "1dAqZUYxepqF2hWDrKVG4", "kR6r3aw8v9NGyxgQ5a5hS", "HChrZr8k9Y53HSdrVao5s"],
  ["03", "ezfVtFMN7EFG1txlk9NBe", "QtVwLHu8BCgPx9PQhDBnY", "uGQU2y1o1eCVres63eaGf", "7IniEtmX0jXKvJN61u89M"],
  ["04", "VyfHHBHEnNjZuWihFqKEc", "2tP3DvwUt4hvulKSFuItz", "7bKJqhsB6ufDrkElP1cEK", "xqv3nYf6qqFQZjR2TvZ5C"],
  ["05", "RlrYGj0kgD2Ksi5yVmVRw", "KO9S4lQklksZ9tL1s2qdu", "qXv1rLNgCNKSt78Auridr", "EcIvnNHxpgcxmXSfcwGjO"]
].flatMap(([chapter, jerseyData, mobileMp4, mobileWebm, feature]) => [
  video(`video-jersey-data-${chapter}`, `chapter-${chapter}-jersey-data.mp4`, `${flowdriveJ}/${jerseyData}`),
  video(`video-mobile-mp4-${chapter}`, `chapter-${chapter}-mobile.mp4`, `${flowdrive}/${mobileMp4}`),
  video(`video-mobile-webm-${chapter}`, `chapter-${chapter}.webm`, `${flowdrive}/${mobileWebm}`),
  ...(feature ? [video(`video-feature-${chapter}`, `chapter-${chapter}-feature.mp4`, `${flowdriveJ}/${feature}`)] : [])
]);

const sceneTextures = [
  ["texture-01", "nm0iCDZaub0a8OBl0U2ho"],
  ["texture-02", "RpznzQ0RukGloZg52lXw2"],
  ["texture-03", "6aXCATra7vxNOSImoUyk5"],
  ["texture-04", "xHLRZhx6xiihQNQZVrZy8"],
  ["texture-05", "esbtW6kLEocXqZych4GES"],
  ["texture-06", "whqDiRcuWF4eZFpAMZ8NM"],
  ["texture-07", "Py9gvKyhc5E4sPAImOOB2"],
  ["texture-08", "cUHRcakE4aY2VN0SSjIs9"],
  ["texture-09", "uBqwgD36UTj7gxGh2ysnx"],
  ["texture-10", "S8oIXOXc6OAfxVg1E2za1"]
].map(([id, source]) => texture(id, `${source}.webp`, `${flowdriveJ}/${source}`));

export const REFERENCE_ASSETS = [
  ...fonts,
  image("hero", "hero.avif", `${webflow}/6905215738e448b78363e9dd_ChatGPT%20Image%2031%20oct.%202025%2C%2021_51_17.avif`),
  image("hero-500", "hero-p-500.avif", `${webflow}/6905215738e448b78363e9dd_ChatGPT%20Image%2031%20oct.%202025%2C%2021_51_17-p-500.avif`),
  image("hero-800", "hero-p-800.avif", `${webflow}/6905215738e448b78363e9dd_ChatGPT%20Image%2031%20oct.%202025%2C%2021_51_17-p-800.avif`),
  image("hero-1080", "hero-p-1080.avif", `${webflow}/6905215738e448b78363e9dd_ChatGPT%20Image%2031%20oct.%202025%2C%2021_51_17-p-1080.avif`),
  image("grain", "grain.webp", `${webflow}/68eae6acbfdfbcaf86ae11d6_grainbg.webp`),
  image("favicon", "favicon.png", `${webflow}/690540548e7df46e86d5c96a_Favicon-Static.png`),
  image("webclip", "webclip.png", `${webflow}/6904e7fc978ba38704d5e81e_Webclip-1.png`),
  image("social-card", "social-card.avif", `${webflow}/6904e78d915f363ef53ff993_OpenGraphe-1.avif`),
  image("jersey-evreux", "jersey-evreux.webp", `${webflow}/68f63c7a9fc10afaf17725ec_maillotevreux.webp`),
  image("jersey-dortmund", "jersey-dortmund.webp", `${webflow}/68f8faeb398fec3f3970d196_dortmundmaillot.webp`),
  image("jersey-barca", "jersey-barca.webp", `${webflow}/68f90744555767ebe9e91c7d_maillotbarca.webp`),
  image("jersey-psg", "jersey-psg.webp", `${webflow}/68f9086c07ef596d4f75aa2d_maillotpsg.webp`),
  ...responsiveImages,
  ...endFrames,
  ...videoCatalog,
  model("model-ballondor", "ballondor.glb", `${flowdrive}/ndCWYxfQxGcUEy9flKQVU`),
  hdr("hdr-theater", "theater.hdr", `${flowdriveJ}/mebCS41pDf3zOuJGnfInp`),
  ...sceneTextures
];

export const FRAME_ASSETS = chapterSources.flatMap(({ chapter, slug }) =>
  Array.from({ length: 152 }, (_, index) => {
    const frame = 40 + index;
    const filename = `${String(frame).padStart(4, "0")}.webp`;
    return {
      id: `frame-chapter-${chapter}-${String(frame).padStart(4, "0")}`,
      sourceUrl: `${frames}/output-${slug}/${filename}`,
      category: "frame",
      localPath: `/assets/reference/frames/chapter-${chapter}/${filename}`,
      rightsStatus: "reference-only"
    };
  })
);

export const AUDIO_ASSET = {
  id: "audio-reference-hold-to-play",
  sourceUrl: `${flowdrive}/VcyVSkpfnnNl7vDNePKTc`,
  category: "audio",
  localPath: "/assets/reference/audio/hold-to-play.mp3",
  rightsStatus: "reference-only"
};

export const ALL_ASSETS = [...REFERENCE_ASSETS, ...FRAME_ASSETS, AUDIO_ASSET];
