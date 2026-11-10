import {SignUpForm} from "@/features/auth";
import {UiHeader} from "@/shared/ui/ui-header";
import {Metadata} from "next";

export const metadata: Metadata = {
    title: "Регистрация",
};

export default function SignUpPage() {

    return (
        <div className="flex flex-col items-center">
            {/* Хедр */}
            <UiHeader variant="withoutLogo"/>

            {/* Формочка регистрации */}
            <SignUpForm/>
        </div>
    );
}
