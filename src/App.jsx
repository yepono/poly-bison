import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Recuperar from "./pages/Recuperar";
import Layout from "./components/Layout";
import Feed from "./pages/Feed"; 
import Aulas from "./pages/Aulas"
import Bisontstore from "./pages/Bisontstore";
import Calendario from "./pages/Calendario";
import Mapa from "./pages/Mapa";
import Configuracion from "./pages/Configuracion";
import Perfil from "./pages/Perfil";
import Publicacion from "./pages/Publicacion";
import Admin from "./pages/Admin";
import { useAppData } from "./context/AppDataContext";

// Solo deja pasar con sesión activa (validada por el servidor en usuarios.php?accion=me)
function RequireAuth({ children }) {
  const { user, authStatus } = useAppData();
  const location = useLocation();
  if (authStatus === "loading") return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Clave temporal: solo puede estar en Configuración hasta cambiarla (el PHP también lo exige)
  if (user.debeCambiarContrasena && location.pathname !== "/configuracion") return <Navigate to="/configuracion" replace />;
  return children;
}

function App() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
    <Routes location={backgroundLocation || location}>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar" element={<Recuperar />} />

      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/feed" element={<Feed />} />
        <Route path="/publicacion/:postId" element={<Publicacion />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/perfil/:userId" element={<Perfil />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/aulas" element={<Aulas />} />
        <Route path="Bisontstore" element={<Bisontstore />} />
        <Route path="Calendario" element={<Calendario />} />
        <Route path="Mapa" element={<Mapa />} />
      </Route>
    </Routes>
    {backgroundLocation && (
      <Routes>
        <Route path="/publicacion/:postId" element={<RequireAuth><Publicacion modal /></RequireAuth>} />
      </Routes>
    )}
    </>
  );
}

export default App;