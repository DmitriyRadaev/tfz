/**
 * Ключи запросов react-query в одном месте.
 *
 * Собранные вместе иерархические ключи позволяют инвалидировать ровно нужное
 * поддерево кэша. Прежний код после каждой мутации вызывал
 * `invalidateQueries()` без аргументов — это помечало устаревшим весь кэш,
 * включая профиль и списки, которые не менялись.
 */
export const queryKeys = {
    profile: ["profile"] as const,

    patients: {
        all: ["patients"] as const,
        list: () => [...queryKeys.patients.all, "list"] as const,
        detail: (id: number) => [...queryKeys.patients.all, "detail", id] as const,
    },

    calculations: {
        all: ["calculations"] as const,
        byPatient: (patientId: number, mode?: string) =>
            [
                ...queryKeys.calculations.all,
                "by-patient",
                patientId,
                mode ?? "all",
            ] as const,
        detail: (id: number) =>
            [...queryKeys.calculations.all, "detail", id] as const,
    },

    scoring: {
        all: ["scoring"] as const,
        active: () => [...queryKeys.scoring.all, "active"] as const,
        versions: () => [...queryKeys.scoring.all, "versions"] as const,
    },

    workerProfiles: {
        all: ["worker-profiles"] as const,
        list: () => [...queryKeys.workerProfiles.all, "list"] as const,
    },
} as const;
