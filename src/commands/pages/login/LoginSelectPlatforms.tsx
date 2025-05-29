import {Box, Text} from "ink";
import {MultiSelect} from "@inkjs/ui";

export default function LoginSelectPlatforms(props: { onSubmit: (values: string[]) => void }) {
    return (
        <>
            <Text bold={true} color={"magentaBright"}>LOGIN WITH HEIMDALL</Text>
            <Text italic={true}>
                Specify which platforms your project supports, this will be saved locally on your project and
                will be used to help us determine which platforms to automatically bundle every release.
            </Text>
            <Box flexDirection={"column"}>
                <Text bold={true}>Platforms: </Text>
                <MultiSelect
                    options={[
                        {
                            label: "Android",
                            value: "android"
                        },
                        {
                            label: "iOS",
                            value: "ios"
                        }
                    ]}
                    onSubmit={(values) => {
                        props.onSubmit(values);
                    }}
                />
            </Box>
        </>
    )
}
