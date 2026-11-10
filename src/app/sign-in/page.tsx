import { Suspense } from "react";
import { Metadata } from "next";

import { SignInForm } from "@/features/auth";
import { UiHeader } from "@/shared/ui/ui-header";
import { UiSpinner } from "@/shared/ui/ui-spinner";

export const metadata: Metadata = {
    title: "Авторизация",
    robots: {
        index: false,
        follow: false,
    },
};

export default function SignInPage() {
    return (
        <div className="flex flex-col items-center">
            {/* Хедер */}
            <UiHeader variant="logo" />

            {/*
             * Форма читает query-параметр `redirect` через useSearchParams,
             * поэтому её рендер должен быть отложен до гидрации — иначе
             * страницу нельзя отрендерить статически на этапе сборки.
             */}
            <Suspense
                fallback={
                    <div className="flex w-full max-w-md justify-center py-10">
                        <UiSpinner />
                    </div>
                }
            >
                <SignInForm />
            </Suspense>
        </div>
    );
}
