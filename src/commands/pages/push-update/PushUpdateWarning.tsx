import {Box, Text} from "ink";
import {ConfirmInput, UnorderedList} from "@inkjs/ui";
import Border from "../../../components/Border.tsx";
import credentials = globalThis.credentials;

export default function PushUpdateWarning(props: { onConfirm: () => void }) {
    return (
        <Border borderColor={"yellow"} width={"60%"}>
            <Text color={"redBright"} bold={true}>WARNING</Text>
            <Text italic={true}>
                Pushing an update will force all users opening your application to download the latest update,
                this may have irreversible effects, especially if the update is not tested properly as rolling
                back to a previous version is not possible.
            </Text>
            <Text color={"redBright"} bold={true}>
                You are pushing an update to {credentials?.environment ?? "Default"} environment.
            </Text>
            <Text italic={true}>
                Please ensure that you have met these following conditions:
            </Text>
            <UnorderedList>
                <UnorderedList.Item>
                    <Text italic={true}>You have tested the update on a physical device or simulator.</Text>
                </UnorderedList.Item>
                <UnorderedList.Item>
                    <Text italic={true}>Your <Text bold={true}>.env</Text> is configured on production environment.</Text>
                </UnorderedList.Item>
            </UnorderedList>
            <Box flexDirection={"row"}>
                <Text>
                    If you are sure that you want to push the update, please type <Text bold={true}>y</Text>. (
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
        </Border>
    )
}
