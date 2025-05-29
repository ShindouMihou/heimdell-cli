import {Box} from "ink";
import * as React from "react";

type BorderProps = {
    borderColor?: string;
    padding?: number;
    gap?: number;
    width?: number | string;
    children: React.ReactNode;
}
export default function Border(props: BorderProps) {
    const { borderColor = "blue", padding = 1, width = "50%", gap = 1, children } = props;
    return (
        <Box
            flexDirection={"column"}
            padding={padding}
            borderStyle={"doubleSingle"}
            borderColor={borderColor}
            borderTop={true}
            borderBottom={true}
            borderLeft={true}
            borderRight={true}
            width={width}
            gap={gap}
        >
            {children}
        </Box>
    )
}
