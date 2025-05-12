import { H1 } from "@hopper-ui/components";
import { Div } from "@hopper-ui/styled-system";

export default function() {
    return (
        <>
            <H1>Page C!</H1>
            <Div>This page includes a <code>/app</code> URL segment to simulate a direct hit to a React Router route that includes a segment.</Div>
        </>
    );
}
