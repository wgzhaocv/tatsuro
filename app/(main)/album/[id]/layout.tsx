import { PageScroll } from "@/components/page-scroll";

/**
 * One scroll scope per album: the default edition and /:id/:year pages swap
 * below this layout, so switching editions keeps the listener's place, while
 * leaving the album (and coming back) restores it.
 */
export default function AlbumScrollScope({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageScroll />
      {children}
    </>
  );
}
