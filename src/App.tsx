import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import WorldPage from "./pages/WorldPage";

const WritingsPage = lazy(() => import("./pages/WritingsPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<WorldPage />} />
        <Route path="/athenaeum" element={<LibraryPage />} />
        <Route path="/bakery" element={<WritingsPage />} />
      </Routes>
    </Suspense>
  );
}
