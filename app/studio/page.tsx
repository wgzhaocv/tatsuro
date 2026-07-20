import { LyricsStudio } from "@/components/studio/lyrics-studio";

// Everything the studio needs is fetched client-side from the lyrics API, so
// this is a static shell that hydrates into the tool.
export default function StudioPage() {
  return <LyricsStudio />;
}
