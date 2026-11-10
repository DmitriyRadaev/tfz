"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { getQueryClient } from "@/shared/api/query-client";

/**
 * Провайдер react-query.
 *
 * Клиент создаётся через `useState`, а не на уровне модуля: так при рендере на
 * сервере каждый запрос получает собственный кэш и данные одного пользователя
 * не могут утечь другому.
 */
export function AppProvider({ children }: { children?: ReactNode }) {
    const [queryClient] = useState(getQueryClient);

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
