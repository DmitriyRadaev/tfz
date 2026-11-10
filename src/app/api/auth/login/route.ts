import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/api-error";
import { json, parseBody, withApi } from "@/server/http/handler";
import { fixedWindowRateLimit, resetRateLimit } from "@/server/redis/rate-limit";
import { findAccountByEmail } from "@/server/services/accounts";
import { toAccountDto } from "@/server/services/presenters";
import { env } from "@/server/env";
import { loginSchema } from "@/server/validation/schemas";
import { clientIp } from "@/server/http/client-ip";

/** POST /api/auth/login — перенос `loginView`. */
export const POST = withApi(async (request) => {
    const { LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_SECONDS } = env();

    const ip = clientIp(request);
    const limit = await fixedWindowRateLimit(
        `login:${ip}`,
        LOGIN_RATE_LIMIT,
        LOGIN_RATE_WINDOW_SECONDS,
    );

    if (!limit.success) {
        throw ApiError.tooManyRequests(
            "Слишком много попыток входа. Попробуйте позже.",
            limit.retryAfter,
        );
    }

    const { email, password } = await parseBody(request, loginSchema);

    const account = await findAccountByEmail(email);

    // Пароль проверяется даже при отсутствии аккаунта — иначе по времени ответа
    // можно было бы перечислить зарегистрированные адреса.
    const passwordMatches = account
        ? await verifyPassword(password, account.passwordHash)
        : await verifyPassword(password, DUMMY_PASSWORD_HASH);

    if (!account || !passwordMatches) {
        throw ApiError.unauthorized("Неверный email или пароль.");
    }

    if (!account.isActive) {
        throw ApiError.forbidden(
            "Учётная запись неактивна. Обратитесь к администратору: " +
                "новые регистрации подтверждаются вручную.",
        );
    }

    await resetRateLimit(`login:${ip}`);
    await createSession({
        id: account.id,
        email: account.email,
        role: account.role,
        sessionVersion: account.sessionVersion,
    });

    // Токены живут только в httpOnly-куках и в тело ответа не попадают:
    // иначе их мог бы прочитать любой скрипт на странице.
    return json({ user: toAccountDto(account) });
});
