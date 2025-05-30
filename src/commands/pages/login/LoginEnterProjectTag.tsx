import {Box, Text} from "ink";
import {TextInput} from "@inkjs/ui";

export default function LoginEnterProjectTag(props: { onSubmit: (tag: string) => void }) {
    return (
        <>
            <Text bold={true} color={"magentaBright"}>LOGIN WITH HEIMDELL</Text>
            <Text italic={true}>
                A tag is a unique identifier for your Heimdell project. We'll save this tag on the project, so that
                you don't have to re-enter it over and over again. If you do not know your project tag, please contact
                the administrator who deployed Heimdell.
            </Text>
            <Box>
                <Text bold={true}>Tag: </Text>
                <TextInput
                    placeholder={"Type your project tag here"}
                    onSubmit={props.onSubmit}
                />
            </Box>
        </>
    )
}
