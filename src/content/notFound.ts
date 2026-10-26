export interface NotFoundMeme {
  id: string;
  src: string;
  width: number;
  height: number;
  video: string;
}

export const notFoundTitle = "ousmane memebele";
export const notFoundBackLabel = "back in the game";

export const notFoundBall = {
  src: "/assets/reference/images/404/ballon.avif",
  width: 168,
  height: 171
};

export const notFoundMemes: NotFoundMeme[] = [
  {
    id: "1",
    src: "/assets/reference/images/404/meme-1.avif",
    width: 144,
    height: 177,
    video: "/assets/reference/video/memes/meme-1.mp4"
  },
  {
    id: "2",
    src: "/assets/reference/images/404/meme-2.avif",
    width: 130,
    height: 168,
    video: "/assets/reference/video/memes/meme-2.mp4"
  },
  {
    id: "3",
    src: "/assets/reference/images/404/meme-3.avif",
    width: 118,
    height: 143,
    video: "/assets/reference/video/memes/meme-3.mp4"
  },
  {
    id: "4",
    src: "/assets/reference/images/404/meme-4.avif",
    width: 132,
    height: 158,
    video: "/assets/reference/video/memes/meme-4.mp4"
  },
  {
    id: "5",
    src: "/assets/reference/images/404/meme-5.avif",
    width: 148,
    height: 192,
    video: "/assets/reference/video/memes/meme-5.mp4"
  }
];
