import type { Metadata } from "next";
import { NotFoundExperience } from "@/src/components/NotFoundExperience";

export const metadata: Metadata = {
  title: "Not Found",
  robots: {
    index: false,
    follow: false
  }
};

export default function NotFound() {
  return <NotFoundExperience />;
}
