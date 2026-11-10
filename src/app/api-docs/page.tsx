import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "TFZ API — документация",
    robots: { index: false, follow: false },
};

/**
 * Документация API — замена страниц swagger-ui и redoc из drf-spectacular.
 *
 * Схема подтягивается с `/api/openapi` в рантайме, поэтому страница всегда
 * показывает актуальный контракт без отдельного шага генерации.
 */
export default function ApiDocsPage() {
    return (
        <>
            <div id="api-reference" data-url="/api/openapi" />
            <script
                src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.123/dist/browser/standalone.min.js"
                async
            />
        </>
    );
}
