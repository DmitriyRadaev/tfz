import { requireUser } from "@/server/auth/guards";
import { json, withApi } from "@/server/http/handler";
import { buildOpenApiDocument } from "@/server/openapi/document";

/**
 * GET /api/openapi — машиночитаемая схема API (замена `/api/schema/`).
 *
 * Как и в исходном проекте, схема доступна только аутентифицированным
 * пользователям: в DRF её закрывал `DEFAULT_PERMISSION_CLASSES`.
 * Человекочитаемая версия — на странице `/api-docs`.
 */
export const GET = withApi(async () => {
    await requireUser();
    return json(buildOpenApiDocument());
});
