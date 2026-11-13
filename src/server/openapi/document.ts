import { z } from "zod";
import { appPath } from "@/shared/lib/app-path";

import {
    accountActivationSchema,
    calculateRequestSchema,
    updateProfileSchema,
    createPatientSchema,
    loginSchema,
    privilegedRegistrationSchema,
    updatePatientSchema,
    workerProfileUpdateSchema,
    workerRegistrationSchema,
} from "@/server/validation/schemas";

/**
 * Сборка OpenAPI-документа — замена drf-spectacular.
 *
 * Схемы тел запросов не описываются повторно: они выводятся из тех же zod-схем,
 * которыми валидируются запросы (`z.toJSONSchema`), поэтому документация не
 * может разойтись с реальной валидацией.
 */

type JsonSchema = Record<string, unknown>;

function toSchema(schema: z.ZodType): JsonSchema {
    return z.toJSONSchema(schema, {
        target: "draft-2020-12",
        io: "input",
        // Неподдерживаемые конструкции (например, `refine`) не должны ломать
        // сборку документа — для них достаточно свободной схемы.
        unrepresentable: "any",
    }) as JsonSchema;
}

/* ------------------------------------------------------------------ *
 * Схемы ответов
 * ------------------------------------------------------------------ */

const accountResponse: JsonSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        email: { type: "string", format: "email" },
        name: { type: "string" },
        surname: { type: "string" },
        patronymic: { type: "string" },
        role: { type: "string", enum: ["SUPERADMIN", "ADMIN", "WORKER"] },
        role_display: { type: "string" },
        is_active: { type: "boolean" },
        is_staff: { type: "boolean" },
        is_superuser: { type: "boolean" },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
    },
    required: ["id", "email", "name", "surname", "role"],
};

const patientResponse: JsonSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        name: { type: "string" },
        surname: { type: "string" },
        patronymic: { type: "string" },
        birth_date: { type: "string", format: "date" },
        gender: { type: "integer", enum: [0, 1] },
        gender_display: { type: "string" },
        full_name: { type: "string" },
        created_at: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "surname", "birth_date", "gender"],
};

const calculationResponse: JsonSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        patient: { ...patientResponse, nullable: true },
        doctor: { ...accountResponse, nullable: true },
        mode: { type: "string", enum: ["dtz", "mtz"] },
        mode_display: { type: "string" },
        age: { type: "integer" },
        gender: { type: "string", enum: ["male", "female"] },
        gender_display: { type: "string" },
        st4: { type: "number" },
        ttg: { type: "number" },
        atrttg: { type: "number" },
        thyroid_volume: { type: "number" },
        eop_stage: { type: "integer" },
        thyrostatic_daily_dose_mg: { type: "number" },
        thyrostatic_therapy_duration_months: { type: "number" },
        ccc_complications: { type: "boolean" },
        compression_syndrome: { type: "boolean" },
        slco1b1_polymorphism: { type: "boolean" },
        nodules_bilateral: {
            type: ["boolean", "null"],
            description:
                "Только для МТЗ: узлы в обеих долях (true) или в одной (false).",
        },
        score: { type: "integer" },
        severity: { type: "string" },
        ruleset_version: {
            type: "integer",
            description: "Версия шкалы, по которой выполнен расчёт.",
        },
        breakdown: {
            type: "object",
            description: "Вклад каждого критерия в итоговый балл.",
        },
        recommendation: { type: "string" },
        created_at: { type: "string", format: "date-time" },
    },
    required: ["id", "mode", "score", "severity", "recommendation", "created_at"],
};

const workerProfileResponse: JsonSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        user: accountResponse,
        work: { type: "string" },
        position: { type: "string" },
    },
    required: ["id", "user", "work", "position"],
};

const errorResponse: JsonSchema = {
    type: "object",
    properties: {
        detail: { type: "string" },
        errors: {
            type: "object",
            additionalProperties: { type: "array", items: { type: "string" } },
        },
    },
    required: ["detail"],
};

/* ------------------------------------------------------------------ *
 * Хелперы описания операций
 * ------------------------------------------------------------------ */

const jsonContent = (schema: JsonSchema) => ({
    "application/json": { schema },
});

const errors = (...codes: number[]) =>
    Object.fromEntries(
        codes.map((code) => [
            String(code),
            { description: "Ошибка", content: jsonContent(errorResponse) },
        ]),
    );

const idParam = (name: string, description: string) => ({
    name,
    in: "path" as const,
    required: true,
    schema: { type: "integer" },
    description,
});

/* ------------------------------------------------------------------ *
 * Документ
 * ------------------------------------------------------------------ */

export function buildOpenApiDocument() {
    return {
        openapi: "3.1.0",
        info: {
            title: "TFZ API",
            version: "1.0.0",
            description:
                "API системы расчёта интегрального показателя токсических форм зоба.\n\n" +
                "Аутентификация — через httpOnly-куки `access` и `refresh`, которые " +
                "выставляет `POST /auth/login`. Отдельный CSRF-токен не нужен: " +
                "небезопасные методы проверяют заголовок `Origin`.",
        },
        servers: [{ url: appPath("/api") }],
        tags: [
            { name: "Auth", description: "Вход, выход, обновление сессии, регистрация" },
            { name: "Patients", description: "Картотека пациентов" },
            { name: "Calculator", description: "Расчёты и история" },
            { name: "Workers", description: "Профили сотрудников" },
            { name: "Scoring", description: "Шкала расчёта и её версии" },
            { name: "Service", description: "Служебные эндпоинты" },
        ],
        components: {
            securitySchemes: {
                cookieAuth: { type: "apiKey", in: "cookie", name: "access" },
            },
            schemas: {
                Account: accountResponse,
                Patient: patientResponse,
                Calculation: calculationResponse,
                WorkerProfile: workerProfileResponse,
                Error: errorResponse,
            },
        },
        security: [{ cookieAuth: [] }],
        paths: {
            "/auth/login": {
                post: {
                    tags: ["Auth"],
                    summary: "Вход в систему",
                    description:
                        "Выставляет куки `access` и `refresh`. Ограничение частоты — " +
                        "5 попыток в минуту с одного адреса.",
                    security: [],
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(loginSchema)),
                    },
                    responses: {
                        "200": {
                            description: "Успешный вход",
                            content: jsonContent({
                                type: "object",
                                properties: { user: accountResponse },
                            }),
                        },
                        ...errors(400, 401, 403, 429),
                    },
                },
            },
            "/auth/logout": {
                post: {
                    tags: ["Auth"],
                    summary: "Выход из системы",
                    description: "Снимает куки и отзывает refresh-токен. Идемпотентно.",
                    security: [],
                    responses: {
                        "200": {
                            description: "Сессия завершена",
                            content: jsonContent({
                                type: "object",
                                properties: { detail: { type: "string" } },
                            }),
                        },
                    },
                },
            },
            "/auth/refresh": {
                post: {
                    tags: ["Auth"],
                    summary: "Обновление сессии",
                    description:
                        "Читает refresh-куку, аннулирует её и выдаёт новую пару токенов " +
                        "(rotation). Повторное использование токена отзывает все сессии.",
                    security: [],
                    responses: {
                        "200": {
                            description: "Выданы новые токены",
                            content: jsonContent({
                                type: "object",
                                properties: { user: accountResponse },
                            }),
                        },
                        ...errors(401),
                    },
                },
            },
            "/auth/register/worker": {
                post: {
                    tags: ["Auth"],
                    summary: "Регистрация сотрудника",
                    description:
                        "Создаёт неактивную учётную запись: доступ к данным " +
                        "пациентов появляется только после подтверждения " +
                        "администратором через PATCH /accounts/{id}.",
                    security: [],
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(workerRegistrationSchema)),
                    },
                    responses: {
                        "201": {
                            description: "Аккаунт создан",
                            content: jsonContent(accountResponse),
                        },
                        ...errors(400, 409, 429),
                    },
                },
            },
            "/auth/register/admin": {
                post: {
                    tags: ["Auth"],
                    summary: "Регистрация администратора",
                    description: "Доступно только роли SUPERADMIN.",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(privilegedRegistrationSchema)),
                    },
                    responses: {
                        "201": {
                            description: "Аккаунт создан",
                            content: jsonContent(accountResponse),
                        },
                        ...errors(400, 401, 403, 409),
                    },
                },
            },
            "/auth/register/superadmin": {
                post: {
                    tags: ["Auth"],
                    summary: "Регистрация главного администратора",
                    description: "Доступно только роли SUPERADMIN.",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(privilegedRegistrationSchema)),
                    },
                    responses: {
                        "201": {
                            description: "Аккаунт создан",
                            content: jsonContent(accountResponse),
                        },
                        ...errors(400, 401, 403, 409),
                    },
                },
            },
            "/profile": {
                get: {
                    tags: ["Auth"],
                    summary: "Текущий пользователь",
                    responses: {
                        "200": {
                            description: "Профиль",
                            content: jsonContent(accountResponse),
                        },
                        ...errors(401),
                    },
                },
                patch: {
                    tags: ["Auth"],
                    summary: "Редактирование своего профиля",
                    description:
                        "ФИО меняется свободно. Смена email или пароля требует " +
                        "поля `current_password` и завершает сессии на других " +
                        "устройствах; текущему выдаётся новая пара токенов.",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(updateProfileSchema)),
                    },
                    responses: {
                        "200": {
                            description: "Профиль обновлён",
                            content: jsonContent(accountResponse),
                        },
                        ...errors(400, 401, 409),
                    },
                },
            },
            "/accounts/{id}": {
                parameters: [idParam("id", "Идентификатор пользователя")],
                patch: {
                    tags: ["Workers"],
                    summary: "Подтверждение или блокировка учётной записи",
                    description:
                        "Самостоятельная регистрация создаёт неактивный аккаунт; " +
                        "доступ открывает администратор. При блокировке активные " +
                        "сессии пользователя обрываются немедленно. " +
                        "Администратор может управлять только сотрудниками, " +
                        "главный администратор — всеми, кроме себя.",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(accountActivationSchema)),
                    },
                    responses: {
                        "200": {
                            description: "Статус изменён",
                            content: jsonContent(accountResponse),
                        },
                        ...errors(400, 401, 403, 404),
                    },
                },
            },
            "/patients": {
                get: {
                    tags: ["Patients"],
                    summary: "Список пациентов",
                    responses: {
                        "200": {
                            description: "Пациенты, свежие первыми",
                            content: jsonContent({
                                type: "array",
                                items: patientResponse,
                            }),
                        },
                        ...errors(401),
                    },
                },
                post: {
                    tags: ["Patients"],
                    summary: "Добавить пациента",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(createPatientSchema)),
                    },
                    responses: {
                        "201": {
                            description: "Пациент создан",
                            content: jsonContent(patientResponse),
                        },
                        ...errors(400, 401),
                    },
                },
            },
            "/patients/{id}": {
                parameters: [idParam("id", "Идентификатор пациента")],
                get: {
                    tags: ["Patients"],
                    summary: "Карточка пациента",
                    responses: {
                        "200": {
                            description: "Пациент",
                            content: jsonContent(patientResponse),
                        },
                        ...errors(401, 404),
                    },
                },
                patch: {
                    tags: ["Patients"],
                    summary: "Изменить пациента",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(updatePatientSchema)),
                    },
                    responses: {
                        "200": {
                            description: "Пациент обновлён",
                            content: jsonContent(patientResponse),
                        },
                        ...errors(400, 401, 404),
                    },
                },
                delete: {
                    tags: ["Patients"],
                    summary: "Удалить пациента",
                    description: "Каскадно удаляет историю расчётов пациента.",
                    responses: {
                        "204": { description: "Удалён" },
                        ...errors(401, 404),
                    },
                },
            },
            "/patients/{id}/calculate": {
                parameters: [idParam("id", "Идентификатор пациента")],
                post: {
                    tags: ["Calculator"],
                    summary: "Выполнить расчёт",
                    description:
                        "Возраст и пол берутся из карточки пациента; результат " +
                        "сохраняется в историю.",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(calculateRequestSchema)),
                    },
                    responses: {
                        "201": {
                            description: "Расчёт сохранён",
                            content: jsonContent(calculationResponse),
                        },
                        ...errors(400, 401, 404),
                    },
                },
            },
            "/patients/{id}/calculations": {
                parameters: [idParam("id", "Идентификатор пациента")],
                get: {
                    tags: ["Calculator"],
                    summary: "История расчётов пациента",
                    parameters: [
                        {
                            name: "mode",
                            in: "query",
                            required: false,
                            schema: { type: "string", enum: ["dtz", "mtz"] },
                            description: "Фильтр по режиму расчёта",
                        },
                    ],
                    responses: {
                        "200": {
                            description: "Расчёты, свежие первыми",
                            content: jsonContent({
                                type: "array",
                                items: calculationResponse,
                            }),
                        },
                        ...errors(401, 404),
                    },
                },
            },
            "/calculations/{id}": {
                parameters: [idParam("id", "Идентификатор расчёта")],
                get: {
                    tags: ["Calculator"],
                    summary: "Расчёт по идентификатору",
                    responses: {
                        "200": {
                            description: "Расчёт",
                            content: jsonContent(calculationResponse),
                        },
                        ...errors(401, 404),
                    },
                },
                delete: {
                    tags: ["Calculator"],
                    summary: "Удалить расчёт",
                    responses: {
                        "204": { description: "Удалён" },
                        ...errors(401, 404),
                    },
                },
            },
            "/worker-profiles": {
                get: {
                    tags: ["Workers"],
                    summary: "Профили сотрудников",
                    description: "Доступно ролям ADMIN и SUPERADMIN.",
                    responses: {
                        "200": {
                            description: "Профили",
                            content: jsonContent({
                                type: "array",
                                items: workerProfileResponse,
                            }),
                        },
                        ...errors(401, 403),
                    },
                },
            },
            "/worker-profiles/{id}": {
                parameters: [idParam("id", "Идентификатор профиля")],
                get: {
                    tags: ["Workers"],
                    summary: "Профиль сотрудника",
                    responses: {
                        "200": {
                            description: "Профиль",
                            content: jsonContent(workerProfileResponse),
                        },
                        ...errors(401, 403, 404),
                    },
                },
                patch: {
                    tags: ["Workers"],
                    summary: "Изменить профиль сотрудника",
                    requestBody: {
                        required: true,
                        content: jsonContent(toSchema(workerProfileUpdateSchema)),
                    },
                    responses: {
                        "200": {
                            description: "Профиль обновлён",
                            content: jsonContent(workerProfileResponse),
                        },
                        ...errors(400, 401, 403, 404),
                    },
                },
                delete: {
                    tags: ["Workers"],
                    summary: "Удалить профиль сотрудника",
                    responses: {
                        "204": { description: "Удалён" },
                        ...errors(401, 403, 404),
                    },
                },
            },
            "/scoring": {
                get: {
                    tags: ["Scoring"],
                    summary: "Действующая шкала расчёта",
                    description:
                        "Критерии, пороги и веса интегрального показателя. " +
                        "Доступна любому аутентифицированному пользователю: " +
                        "врач должен видеть, по каким правилам считается " +
                        "показатель, которым он пользуется.",
                    responses: {
                        "200": {
                            description: "Шкала",
                            content: jsonContent({ type: "object" }),
                        },
                        ...errors(401),
                    },
                },
            },
            "/scoring/rulesets": {
                get: {
                    tags: ["Scoring"],
                    summary: "История версий шкалы",
                    responses: {
                        "200": {
                            description: "Версии, свежие первыми",
                            content: jsonContent({
                                type: "array",
                                items: { type: "object" },
                            }),
                        },
                        ...errors(401),
                    },
                },
                post: {
                    tags: ["Scoring"],
                    summary: "Публикация новой версии шкалы",
                    description:
                        "Доступно только роли SUPERADMIN. Прежние версии " +
                        "остаются в базе: к ним привязаны выполненные расчёты, " +
                        "и их разбивка по баллам не меняется.",
                    requestBody: {
                        required: true,
                        content: jsonContent({ type: "object" }),
                    },
                    responses: {
                        "201": {
                            description: "Версия опубликована",
                            content: jsonContent({ type: "object" }),
                        },
                        ...errors(400, 401, 403),
                    },
                },
            },
            "/health": {
                get: {
                    tags: ["Service"],
                    summary: "Проверка связности с Postgres и Redis",
                    security: [],
                    responses: {
                        "200": {
                            description: "Все зависимости отвечают",
                            content: jsonContent({
                                type: "object",
                                properties: {
                                    status: { type: "string" },
                                    checks: { type: "object" },
                                },
                            }),
                        },
                        "503": { description: "Одна из зависимостей недоступна" },
                    },
                },
            },
        },
    } as const;
}
