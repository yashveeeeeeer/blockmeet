import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
const WorldPage = lazy(() => import("./pages/WorldPage"));

const WritingsPage = lazy(() => import("./pages/WritingsPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const ShelfPreviewStudio = import.meta.env.DEV ? lazy(() => import("./pages/ShelfPreviewStudio")) : null;

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {ShelfPreviewStudio && <Route path="/__shelf-previews" element={<ShelfPreviewStudio />} />}
        <Route path="/" element={<WorldPage />} />
        <Route path="/athenaeum" element={<LibraryPage />} />
        <Route path="/bakery" element={<WritingsPage />} />
      </Routes>
    </Suspense>
  );
}
