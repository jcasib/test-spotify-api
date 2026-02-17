import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import { Layout }       from "./pages/Layout";
import { Home }         from "./pages/Home";
import { Login }        from "./pages/Login";
import { Register }     from "./pages/Register";
import { Moderator }    from "./pages/Moderator";
import { Admin }        from "./pages/Admin";
import { PublicScreen } from "./pages/PublicScreen";

export const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {/* Pantalla pública del pub — sin navbar */}
            <Route path="/public" element={<PublicScreen />} />

            {/* App principal con navbar */}
            <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>}>
                <Route path="/"          element={<Home />} />
                <Route path="/login"     element={<Login />} />
                <Route path="/register"  element={<Register />} />
                <Route path="/moderator" element={<Moderator />} />
                <Route path="/admin"     element={<Admin />} />
            </Route>
        </>
    )
);
