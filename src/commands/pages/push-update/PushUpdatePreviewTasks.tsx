import {Box, Text} from "ink";
import {ConfirmInput, UnorderedList} from "@inkjs/ui";
import Border from "../../../components/Border.tsx";

export default function PushUpdatePreviewTasks(props: { onConfirm: () => void }) {

    return (
        <Border borderColor={"blue"} width={"40%"}>
            <Text color={"magentaBright"} bold={true}>TASK LIST</Text>
            <Text italic={true}>
                Heimdall will perform the following tasks before pushing the update:
            </Text>
            <UnorderedList>
                <UnorderedList.Item>
                    <Text>Run <Text bold={true}>npm install</Text> to ensure all dependencies are up-to-date.</Text>
                </UnorderedList.Item>
                <UnorderedList.Item>
                    <Text>Run <Text bold={true}>react-native bundle</Text> to create the JavaScript bundle for the following platforms:</Text>
                    <UnorderedList>
                        {globalThis.credentials?.platforms?.map((platform) => (
                            <UnorderedList.Item key={platform}>
                                <Text>{platform}</Text>
                            </UnorderedList.Item>
                        ))}
                    </UnorderedList>
                </UnorderedList.Item>
                <UnorderedList.Item>
                    <Text>Run <Text bold={true}>react-native asset</Text> to prepare assets for the update.</Text>
                </UnorderedList.Item>
                <UnorderedList.Item>
                    <Text>Push the update to Heimdall server.</Text>
                </UnorderedList.Item>
            </UnorderedList>
            <Box>
                <Text>
                    If you confirm with the task list, please type <Text bold={true}>y</Text>. (
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
