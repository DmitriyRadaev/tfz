import {useSignOut} from "../model/use-sign-out";
import clsx from "clsx";

export function SignOutButton({className}: { className?: string }) {
    const {signOut} = useSignOut();

    return (
        <button
            className={clsx(className, "bg-[#006CB4] hover:bg-[#005A94] text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer")}
            onClick={() => signOut()}
        >
            Выход
        </button>
    );
}
