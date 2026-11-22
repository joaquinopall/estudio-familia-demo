import { NotFoundView } from "@/components/layout/not-found-view";

/** 404 for notFound() inside a public route: the layout already provides the shell. */
export default function PublicNotFound() {
  return <NotFoundView />;
}
