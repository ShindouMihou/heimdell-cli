import {Text} from "ink";
import Border from "./Border.tsx";

export default function UnauthenticatedAlert() {
    return (
        <Border
            gap={0}
            width={"30%"}
            borderColor={"red"}
        >
            <Text bold={true} color={"redBright"}>UNAUTHENTICATED</Text>
            <Text italic={true}>
                Login with Heimdall for this project by using the command <Text bold={true}>heimdall login </Text>
                before you can use this command.
            </Text>
        </Border>
    )
}
