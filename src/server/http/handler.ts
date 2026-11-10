import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { ApiError } from "./api-error";
import { assertSameOrigin } from "./origin";

/* ------------------------------------------------------------------ *
 * Ответы
 * ------------------------------------------------------------------ */

export function json<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data, { status });
}

export function noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
}

/* ------------------------------------------------------------------ *
 * Разбор и валидация тела
 * ------------------------------------------------------------------ */

/** Приводит ошибки Zod к формату DRF: `{ поле: ["сообщение"] }`. */
function flattenZodError(error: ZodError): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const key = issue.path.length > 0 ? issue.path.join(".") : "detail";
        (result[key] ??= []).push(issue.message);
    }
    return result;
}

export async function parseBody<T>(
    request: Request,
    schema: ZodType<T>,
): Promise<T> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        throw ApiError.badRequest("Тело запроса должно быть корректным JSON");
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        throw ApiError.badRequest(
            "Проверьте корректность переданных данных",
            flattenZodError(parsed.error),
        );
    }
    return parsed.data;
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = schema.safeParse(params);
    if (!parsed.success) {
        throw ApiError.badRequest(
            "Некорректные параметры запроса",
            flattenZodError(parsed.error),
        );
    }
    return parsed.data;
}

/** Разбор числового идентификатора из пути. */
export function parseId(value: string, label = "Идентификатор"): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw ApiError.badRequest(`${label} должен быть положительным числом`);
    }
    return id;
}

/* ------------------------------------------------------------------ *
 * Обёртка обработчика
 * ------------------------------------------------------------------ */

export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
    params: Promise<P>;
};

type Handler<P extends Record<string, string>> = (
    request: Request,
    context: RouteContext<P>,
) => Promise<NextResponse>;

/**
 * Оборачивает route handler: проверяет источник запроса и превращает брошенные
 * исключения в корректные HTTP-ответы. Благодаря этому сами обработчики пишутся
 * «в счастливом пути» — без try/catch и ручной сборки ответов об ошибках.
 */
export function withApi<P extends Record<string, string> = Record<string, string>>(
    handler: Handler<P>,
): Handler<P> {
    return async (request, context) => {
        try {
            assertSameOrigin(request);
            return await handler(request, context);
        } catch (error) {
            return toErrorResponse(error);
        }
    };
}

export function toErrorResponse(error: unknown): NextResponse {
    if (error instanceof ApiError) {
        return NextResponse.json(
            {
                detail: error.message,
                ...(error.errors ? { errors: error.errors } : {}),
            },
            { status: error.status, headers: error.headers },
        );
    }

    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                detail: "Проверьте корректность переданных данных",
                errors: flattenZodError(error),
            },
            { status: 400 },
        );
    }

    // Неожидаемые ошибки логируем целиком, но наружу отдаём обезличенный текст:
    // детали стека и SQL не должны попадать в браузер.
    console.error("[api] Необработанная ошибка:", error);
    return NextResponse.json(
        { detail: "Внутренняя ошибка сервера" },
        { status: 500 },
    );
}
