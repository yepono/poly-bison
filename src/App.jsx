import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Layout from "./components/Layout";
import Feed from "./pages/Feed"; 
import Aulas from "./pages/Aulas"
import Bisontstore from "./pages/Bisontstore";
import Calendario from "./pages/Calendario";
import Mapa from "./pages/Mapa";
import Configuracion from "./pages/Configuracion";
import Perfil from "./pages/Perfil";
import Publicacion from "./pages/Publicacion";

function App() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
    <Routes location={backgroundLocation || location}>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      <Route element={<Layout />}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/publicacion/:postId" element={<Publicacion />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/aulas" element={<Aulas />} />
        <Route path="Bisontstore" element={<Bisontstore />} />
        <Route path="Calendario" element={<Calendario />} />
        <Route path="Mapa" element={<Mapa />} />
      </Route>
    </Routes>
    {backgroundLocation && (
      <Routes>
        <Route path="/publicacion/:postId" element={<Publicacion modal />} />
      </Routes>
    )}
    </>
  );
}

export default App;