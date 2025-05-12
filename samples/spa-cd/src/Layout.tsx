import { Inline } from "@hopper-ui/components";
import { Div } from "@hopper-ui/styled-system";
import { Suspense } from "react";
import { Link, Outlet } from "react-router";

export function Layout() {
    return (
        <Div>
            <Inline>
                <Link to="/">Home</Link>
                <Link to="/a">Page A</Link>
                <Link to="/b">Page B</Link>
            </Inline>
            <Suspense fallback={<Div>Loading...</Div>}>
                <Outlet />
            </Suspense>
        </Div>
    );
}
