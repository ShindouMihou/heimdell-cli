import {Box, Text} from "ink";
import {ConfirmInput} from "@inkjs/ui";

export default function LoginIntroduction(props: {
    onConfirm: () => void,
    environment?: string,
}) {
    return (
        <>
            <Text>Welcome to <Text bold={true}>Heimdell</Text></Text>
            <Text italic={true}>
                Heimdell is a tool that helps you manage React Native over-the-air updates by taking away
                many of the manual tasks away from you, such as, uploading the bundles, classifying the bundles,
                and creating the releases themselves.
            </Text>
            <Text>
                To get started, you need to log into Heimdell. This will allow Heimdell to auto-load your credentials
                within the project. If you don't have a Heimdell server, please set-up one by referring to the documentations
                at <Text bold={true}>github.com/ShindouMihou/heimdell</Text>.
            </Text>
            {props.environment &&
                <Text bold={true} italic={true} color={"redBright"}>
                    You are adding {props.environment} environment to this project.
                </Text>
            }
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
