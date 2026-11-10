import { z } from "zod";

import { CALCULATION_MODES } from "@/server/db/schema";

/**
 * Схемы валидации входных данных — прямой перенос сериализаторов DRF.
 * Границы значений (min_value и т.п.) сохранены один в один.
 */

/* ------------------------------------------------------------------ *
 * Общие примитивы
 * ------------------------------------------------------------------ */

/**
 * Число из формы. Поля ввода на клиенте по умолчанию содержат пустую строку,
 * а `z.coerce.number()` превратил бы её в 0 — и, например, незаполненная стадия
 * ЭОП молча стала бы «стадия 0». Поэтому пустая строка явно отбрасывается,
 * чтобы сработала ошибка «поле обязательно».
 */
function numberFromInput<T extends z.ZodNumber>(schema: T) {
    return z.preprocess((value) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? value : parsed;
    }, schema);
}

export const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Некорректный формат email").max(254, "Email слишком длинный"));

const passwordSchema = z
    .string()
    .min(6, "Пароль должен содержать не менее 6 символов")
    .max(128, "Пароль слишком длинный");

const personNameSchema = z
    .string()
    .trim()
    .min(1, "Поле обязательно")
    .max(50, "Не более 50 символов");

const optionalPatronymicSchema = z
    .string()
    .trim()
    .max(50, "Не более 50 символов")
    .default("");

/* ------------------------------------------------------------------ *
 * Аутентификация
 * ------------------------------------------------------------------ */

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().pipe(z.string().min(1, "Укажите email")),
    password: z.string().min(1, "Укажите пароль"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Базовая часть регистрации: ФИО, email и подтверждение пароля. */
const registrationBase = z.object({
    email: emailSchema,
    name: personNameSchema,
    surname: personNameSchema,
    patronymic: optionalPatronymicSchema,
    password: passwordSchema,
    password2: passwordSchema,
});

const passwordsMustMatch = {
    check: (data: { password: string; password2: string }) =>
        data.password === data.password2,
    message: "Пароли не совпадают",
    path: ["password"] as const,
};

export const workerRegistrationSchema = registrationBase
    .extend({
        work: z.string().trim().min(1, "Укажите место работы").max(255),
        position: z.string().trim().min(1, "Укажите должность").max(255),
    })
    .refine(passwordsMustMatch.check, {
        message: passwordsMustMatch.message,
        path: [...passwordsMustMatch.path],
    });
export type WorkerRegistrationInput = z.infer<typeof workerRegistrationSchema>;

export const privilegedRegistrationSchema = registrationBase.refine(
    passwordsMustMatch.check,
    { message: passwordsMustMatch.message, path: [...passwordsMustMatch.path] },
);
export type PrivilegedRegistrationInput = z.infer<
    typeof privilegedRegistrationSchema
>;

/* ------------------------------------------------------------------ *
 * Профили сотрудников
 * ------------------------------------------------------------------ */

export const workerProfileUpdateSchema = z
    .object({
        work: z.string().trim().max(255).optional(),
        position: z.string().trim().max(255).optional(),
    })
    .refine((data) => data.work !== undefined || data.position !== undefined, {
        message: "Передайте хотя бы одно поле для обновления",
    });
export type WorkerProfileUpdateInput = z.infer<typeof workerProfileUpdateSchema>;

/**
 * Редактирование собственного профиля.
 *
 * Смена email и смена пароля требуют текущего пароля: без этого достаточно
 * было бы на минуту оставить рабочую станцию без присмотра, чтобы потерять
 * учётную запись.
 */
export const updateProfileSchema = z
    .object({
        name: personNameSchema.optional(),
        surname: personNameSchema.optional(),
        patronymic: z.string().trim().max(50, "Не более 50 символов").optional(),
        email: emailSchema.optional(),
        current_password: z.string().min(1).optional(),
        new_password: passwordSchema.optional(),
        new_password2: passwordSchema.optional(),
    })
    .refine(
        (data) => Object.values(data).some((value) => value !== undefined),
        { message: "Передайте хотя бы одно поле для обновления" },
    )
    .refine(
        (data) => data.new_password === undefined || data.new_password2 !== undefined,
        { message: "Подтвердите новый пароль", path: ["new_password2"] },
    )
    .refine(
        (data) =>
            data.new_password === undefined ||
            data.new_password === data.new_password2,
        { message: "Пароли не совпадают", path: ["new_password2"] },
    )
    .refine(
        (data) =>
            (data.email === undefined && data.new_password === undefined) ||
            Boolean(data.current_password),
        {
            message: "Для смены email или пароля введите текущий пароль",
            path: ["current_password"],
        },
    );
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const accountActivationSchema = z.object({
    is_active: z.boolean(),
});
export type AccountActivationInput = z.infer<typeof accountActivationSchema>;

/* ------------------------------------------------------------------ *
 * Пациенты
 * ------------------------------------------------------------------ */

/** Дата в формате ISO (ГГГГ-ММ-ДД) — ровно то, что отдаёт DatePicker клиента. */
const isoDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате ГГГГ-ММ-ДД")
    .refine((value) => {
        const parsed = new Date(`${value}T00:00:00Z`);
        return (
            !Number.isNaN(parsed.getTime()) &&
            parsed.toISOString().slice(0, 10) === value
        );
    }, "Такой даты не существует")
    .refine(
        (value) => new Date(`${value}T00:00:00Z`).getTime() <= Date.now(),
        "Дата рождения не может быть в будущем",
    );

/** 0 — мужской, 1 — женский (как в модели Django). */
const patientGenderSchema = numberFromInput(
    z
        .number()
        .int("Пол передаётся числом 0 или 1")
        .min(0, "Пол может быть только 0 или 1")
        .max(1, "Пол может быть только 0 или 1"),
);

export const createPatientSchema = z.object({
    name: z.string().trim().min(1, "Укажите имя").max(255),
    surname: z.string().trim().min(1, "Укажите фамилию").max(255),
    patronymic: z.string().trim().max(255).default(""),
    birth_date: isoDateSchema,
    gender: patientGenderSchema,
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = z
    .object({
        name: z.string().trim().min(1, "Укажите имя").max(255).optional(),
        surname: z.string().trim().min(1, "Укажите фамилию").max(255).optional(),
        patronymic: z.string().trim().max(255).optional(),
        birth_date: isoDateSchema.optional(),
        gender: patientGenderSchema.optional(),
    })
    .refine(
        (data) => Object.values(data).some((value) => value !== undefined),
        { message: "Передайте хотя бы одно поле для обновления" },
    );
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

/* ------------------------------------------------------------------ *
 * Расчёт
 * ------------------------------------------------------------------ */

export const calculateRequestSchema = z.object({
    mode: z.enum(CALCULATION_MODES, {
        message: "Режим может быть только dtz или mtz",
    }),
    st4: numberFromInput(z.number().min(0.01, "сТ4 должен быть больше 0")),
    ttg: numberFromInput(z.number().min(0.001, "ТТГ должен быть больше 0")),
    atrttg: numberFromInput(z.number().min(0.01, "АтрТТГ должен быть больше 0")),
    thyroid_volume: numberFromInput(
        z.number().min(0.1, "Объём ЩЖ должен быть больше 0"),
    ),
    eop_stage: numberFromInput(
        z
            .number()
            .int("Стадия ЭОП — целое число")
            .min(0, "Стадия ЭОП от 0 до 6")
            .max(6, "Стадия ЭОП от 0 до 6"),
    ),
    thyrostatic_daily_dose_mg: numberFromInput(
        z.number().min(0, "Доза не может быть отрицательной"),
    ),
    thyrostatic_therapy_duration_months: numberFromInput(
        z.number().min(0, "Длительность не может быть отрицательной"),
    ),
    // Намеренно `boolean`, а не `coerce.boolean()`: последний превратил бы
    // строку "false" в `true`.
    ccc_complications: z.boolean(),
    compression_syndrome: z.boolean(),
    slco1b1_polymorphism: z.boolean(),
    /**
     * Локализация узлов: обе доли или одна. Имеет смысл только для МТЗ,
     * поэтому поле необязательное, а его обязательность для режима `mtz`
     * проверяется ниже.
     */
    nodules_bilateral: z.boolean().nullish(),
})
    .refine(
        (data) => data.mode !== "mtz" || typeof data.nodules_bilateral === "boolean",
        {
            message:
                "Для МТЗ укажите локализацию узлов: в обеих долях или в одной",
            path: ["nodules_bilateral"],
        },
    )
    // У ДТЗ признака локализации узлов нет — приводим к null, чтобы в историю
    // не попало значение, которое ни на что не влияло.
    .transform((data) => ({
        ...data,
        nodules_bilateral:
            data.mode === "mtz" ? (data.nodules_bilateral as boolean) : null,
    }));
export type CalculateRequestInput = z.infer<typeof calculateRequestSchema>;

export const calculationListQuerySchema = z.object({
    mode: z.enum(CALCULATION_MODES).optional(),
});
export type CalculationListQuery = z.infer<typeof calculationListQuerySchema>;
