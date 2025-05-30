import {Box, Text} from "ink";
import {PasswordInput, TextInput} from "@inkjs/ui";

export default function LoginEnterPassword(props: { username: string, onSubmit: (password: string) => void }) {
    return (
        <>
            <Text bold={true} color={"magentaBright"}>LOGIN WITH HEIMDELL</Text>
            <Text italic={true}>
                Please enter your Heimdell account credentials here.
                This will be saved on your local machine, so you won't have to enter them again.
            </Text>
            <Box>
                <Text bold={true}>Username: </Text>
                <TextInput
                    defaultValue={props.username}
                    isDisabled={true}
                />
            </Box>
            <Box>
                <Text bold={true}>Password: </Text>
                <PasswordInput
                    placeholder={"Type your password here"}
                    onSubmit={props.onSubmit}
                />
            </Box>
        </>
    )
}
