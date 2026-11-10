import "server-only";

import {
    randomBytes,
    scrypt,
    timingSafeEqual,
    type ScryptOptions,
} from "node:crypto";

/**
 * `promisify(scrypt)` теряет перегрузку с объектом параметров, поэтому
 * оборачиваем вручную.
 */
function scryptAsync(
    password: string,
    salt: Buffer,
    keyLength: number,
    options: ScryptOptions,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, keyLength, options, (error, derivedKey) => {
            if (error) reject(error);
            else resolve(derivedKey);
        });
    });
}

/**
 * Хеширование паролей через scrypt из стандартной библиотеки Node.
 *
 * Почему не argon2id (который OWASP ставит первым): все его реализации для Node
 * — нативные аддоны, а значит лишний риск на сборке в Vercel. scrypt входит в
 * OWASP-список допустимых memory-hard функций, идёт в составе Node и не требует
 * ни одной зависимости. Параметры ниже дают ~64 МБ памяти на проверку — это
 * комфортно внутри лимита serverless-функции (1024 МБ) и достаточно дорого
 * для атаки перебором.
 */
const SCRYPT_PARAMS = {
    N: 2 ** 16, // cost
    r: 8, // block size
    p: 1, // parallelization
    keyLength: 64,
    saltLength: 16,
    // maxmem по умолчанию в Node — 32 МБ, при N=2^16 этого не хватает.
    maxmem: 192 * 1024 * 1024,
} as const;

const ALGORITHM_ID = "scrypt";

/** Формат строки: `scrypt$N$r$p$<salt base64url>$<hash base64url>`. */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SCRYPT_PARAMS.saltLength);

    const derivedKey = await scryptAsync(
        password.normalize("NFKC"),
        salt,
        SCRYPT_PARAMS.keyLength,
        {
            N: SCRYPT_PARAMS.N,
            r: SCRYPT_PARAMS.r,
            p: SCRYPT_PARAMS.p,
            maxmem: SCRYPT_PARAMS.maxmem,
        },
    );

    return [
        ALGORITHM_ID,
        SCRYPT_PARAMS.N,
        SCRYPT_PARAMS.r,
        SCRYPT_PARAMS.p,
        salt.toString("base64url"),
        derivedKey.toString("base64url"),
    ].join("$");
}

/**
 * Проверка пароля. Никогда не бросает исключений на повреждённом хеше —
 * возвращает `false`, чтобы битая запись в БД не превращалась в 500.
 */
export async function verifyPassword(
    password: string,
    storedHash: string,
): Promise<boolean> {
    try {
        const parts = storedHash.split("$");
        if (parts.length !== 6 || parts[0] !== ALGORITHM_ID) return false;

        const [, rawN, rawR, rawP, saltB64, hashB64] = parts;
        const N = Number(rawN);
        const r = Number(rawR);
        const p = Number(rawP);
        if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
            return false;
        }

        const salt = Buffer.from(saltB64, "base64url");
        const expected = Buffer.from(hashB64, "base64url");
        if (salt.length === 0 || expected.length === 0) return false;

        const actual = await scryptAsync(
            password.normalize("NFKC"),
            salt,
            expected.length,
            { N, r, p, maxmem: SCRYPT_PARAMS.maxmem },
        );

        // Сравнение за константное время — иначе по времени ответа можно
        // побайтово восстановить правильный хеш.
        return timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}

/**
 * Заведомо несовпадающий хеш корректного формата.
 *
 * Нужен, чтобы при входе с незарегистрированным email всё равно выполнялся
 * один проход scrypt: без этого ответ «нет такого пользователя» приходил бы
 * заметно быстрее, и по времени можно было бы перечислить реальные адреса.
 */
export const DUMMY_PASSWORD_HASH = `${ALGORITHM_ID}$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${Buffer.from(
    "timing-equalizer",
).toString("base64url")}$${Buffer.alloc(64, 0).toString("base64url")}`;
