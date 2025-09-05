import {Box, Text} from "ink";
import {PasswordInput} from "@inkjs/ui";

export default function DecryptPage(props: {
    onSubmit: () => void
}) {
    return (
        <>
            <Text bold={true} color={"magentaBright"}>DECRYPT YOUR CREDENTIALS</Text>
            <Text italic={true}>
                Please enter your private encryption key here.
                DO NOT USE THIS TERMINAL SESSION FOR ANYTHING ELSE AS WE KEEP THE
                DECRYPTED CREDENTIALS IN SESSION ENVIRONMENT VARIABLES.
            </Text>
            <Box>
                <Text bold={true}>Encryption Key: </Text>
                <PasswordInput
                    placeholder={"Type your password here"}
                    onSubmit={props.onSubmit}
                />
            </Box>
        </>
    )
}