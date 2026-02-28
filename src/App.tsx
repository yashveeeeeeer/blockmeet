import { Routes, Route } from "react-router-dom";
import WorldPage from "./pages/WorldPage";
import WritingsPage from "./pages/WritingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorldPage />} />
      <Route path="/athenaeum" element={<WritingsPage />} />
    </Routes>
  );
}
