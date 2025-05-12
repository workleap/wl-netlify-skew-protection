import { HopperProvider } from "@hopper-ui/components";
import { lazy } from "react";
import { Route, Routes, useNavigate } from "react-router";
import { Layout } from "./Layout.tsx";

const Home = lazy(() => import("./Home.tsx"));
const PageA = lazy(() => import("./PageA.tsx"));
const PageB = lazy(() => import("./PageB.tsx"));
const PageC = lazy(() => import("./PageC.tsx"));

export function App() {
    const navigate = useNavigate();

    return (
        <HopperProvider navigate={navigate} withBodyStyle>
            <Routes>
                <Route element={<Layout />}>
                    <Route
                        index
                        element={<Home />}
                    />
                    <Route
                        path="/a"
                        element={<PageA />}
                    />
                    <Route
                        path="/b"
                        element={<PageB />}
                    />
                    <Route
                        path="/app/c"
                        element={<PageC />}
                    />
                </Route>
            </Routes>
        </HopperProvider>
    );
}
