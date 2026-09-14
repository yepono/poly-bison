import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Layout from "./components/Layout";
import Feed from "./pages/Feed"; 
import Aulas from "./pages/Aulas"
import Bisontstore from "./pages/Bisontstore";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      <Route element={<Layout />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/aulas" element={<Aulas />} />
        <Route path="Bisontstore" element={<Bisontstore />} />
      </Route>
    </Routes>
  );
}

export default App;