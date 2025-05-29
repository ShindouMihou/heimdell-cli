import {Box, Text} from "ink";
import {ConfirmInput} from "@inkjs/ui";

export default function LoginIntroduction(props: { onConfirm: () => void }) {
    return (
        <>
            <Text>Welcome to <Text bold={true}>Heimdall</Text></Text>
            <Text italic={true}>
                Heimdall is a tool that helps you manage React Native over-the-air updates by taking away
                many of the manual tasks away from you, such as, uploading the bundles, classifying the bundles,
                and creating the releases themselves.
            </Text>
            <Text>
                To get started, you need to log into Heimdall. This will allow Heimdall to auto-load your credentials
                within the project. If you don't have a Heimdall server, please set-up one by referring to the documentations
                at <Text bold={true}>github.com/ShindouMihou/heimdell</Text>.
            </Text>
            <Box>
                <Text>
                    Please confirm that you have an Heimdell server running. (
                </Text>
                <ConfirmInput
                    onConfirm={props.onConfirm}
                    submitOnEnter={true}
                    onCancel={() => process.exit(0)}
                />
                <Text>
                    )
                </Text>
            </Box>
        </>
    )
}
