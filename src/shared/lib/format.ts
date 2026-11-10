/**
 * Форматирование дат для интерфейса.
 *
 * API отдаёт даты в ISO 8601 (в отличие от прежнего бэкенда, который сразу
 * возвращал «ДД.ММ.ГГГГ»). ISO корректно сортируется и сравнивается, а под
 * локаль строка приводится здесь, в одном месте.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
});

function parse(value: string | null | undefined): Date | null {
    if (!value) return null;

    // Дата без времени трактуется как UTC-полдень: иначе в часовых поясах
    // западнее UTC «2000-01-01» показывалось бы как 31.12.1999.
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T12:00:00Z`
        : value;

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** `2001-02-03` → `03.02.2001`. */
export function formatDate(value: string | null | undefined): string {
    const date = parse(value);
    return date ? DATE_FORMATTER.format(date) : "—";
}

/** `2001-02-03T10:20:30Z` → `03.02.2001, 13:20` (в локальном поясе). */
export function formatDateTime(value: string | null | undefined): string {
    const date = parse(value);
    return date ? DATE_TIME_FORMATTER.format(date) : "—";
}

/** Компактная подпись для осей графика: `03.02.01`. */
export function formatShortDate(value: string | null | undefined): string {
    const date = parse(value);
    return date ? SHORT_DATE_FORMATTER.format(date) : "—";
}

/**
 * Склонение слова «год» по числу: 1 год, 2 года, 5 лет, 21 год, 44 года.
 *
 * Сокращение одной буквой здесь не годится: «21 г.» читается как «21 год»
 * (верно), а «21 л.» — нет. Поэтому слово пишется целиком, и для всех
 * возрастов форма получается правильная.
 */
export function pluralizeYears(count: number): string {
    const lastTwo = Math.abs(count) % 100;
    // 11–14 — исключение: «одиннадцать лет», а не «одиннадцать год».
    if (lastTwo >= 11 && lastTwo <= 14) return "лет";

    switch (Math.abs(count) % 10) {
        case 1:
            return "год";
        case 2:
        case 3:
        case 4:
            return "года";
        default:
            return "лет";
    }
}

/** `41` → `41 год`, `54` → `54 года`, `25` → `25 лет`. */
export function formatYears(count: number): string {
    return `${count} ${pluralizeYears(count)}`;
}

/** Возраст по дате рождения в виде готовой строки: `41 год`. */
export function formatAge(birthDate: string | null | undefined): string | null {
    const age = calculateAge(birthDate);
    return age === null ? null : formatYears(age);
}

/** Полных лет на текущую дату. */
export function calculateAge(birthDate: string | null | undefined): number | null {
    const date = parse(birthDate);
    if (!date) return null;

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age -= 1;
    }

    return Math.max(0, age);
}
