import {Box, Text} from "ink";
import {TextInput} from "@inkjs/ui";

export default function EnterServerAddress(props: { onSubmit: (address: string) => void }) {
    return (
        <>
            <Text bold={true} color={"magentaBright"}>LOGIN WITH HEIMDALL</Text>
            <Text italic={true}>
                Please enter your Heimdell server address below. This is the address where your Heimdell server is hosted.
                If you have no clue what that is, please refer to the documentations.
            </Text>
            <Box>
                <Text bold={true}>Server Address: </Text>
                <TextInput
                    placeholder={"Type your server address here"}
                    onSubmit={props.onSubmit}
                />
            </Box>
        </>
    )
}
