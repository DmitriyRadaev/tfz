/**
 * IP клиента для rate-limit.
 *
 * На Vercel запрос всегда идёт через прокси, поэтому реальный адрес приходит в
 * заголовке. `x-forwarded-for` может содержать цепочку — берём первый элемент,
 * то есть адрес исходного клиента.
 *
 * Заголовки подделываемы, если приложение открыто в обход прокси, поэтому это
 * защита от грубого перебора, а не механизм безопасности сам по себе.
 */
export function clientIp(request: Request): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const first = forwardedFor.split(",")[0]?.trim();
        if (first) return first;
    }

    return (
        request.headers.get("x-real-ip") ??
        request.headers.get("cf-connecting-ip") ??
        "unknown"
    );
}
