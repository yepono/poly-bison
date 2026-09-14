import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Layout from "./components/Layout";
import CreatePost from "./components/CreatePost";

// Componente temporal para el Feed
const Feed = () => <h2 className="text-text-title-dark text-2xl font-bold">Feed de Publicaciones</h2>;

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      {/* Rutas Protegidas / Internas envueltas por el Layout */}
      <Route element={<Layout />}>
        <Route path="/feed" element={<Feed />} />
        {/* Aquí agregaremos /aulas y /bisontstore después */}
        <Route path="/post" element={<CreatePost/>}/>
      </Route>
    </Routes>
  );
}

export default App;