import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import WorldPage from "./pages/WorldPage";

const WritingsPage = lazy(() => import("./pages/WritingsPage"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<WorldPage />} />
        <Route path="/athenaeum" element={<WritingsPage />} />
      </Routes>
    </Suspense>
  );
}
