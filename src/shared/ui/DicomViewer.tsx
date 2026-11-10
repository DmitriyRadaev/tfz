/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
    src: string[];
}

export default function DicomViewer({ src }: Props) {
    const elementRef = useRef<HTMLDivElement | null>(null);
    const cornerstoneRef = useRef<any>(null);

    const [imageIds, setImageIds] = useState<string[]>([]);
    const [index, setIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isElementEnabled, setIsElementEnabled] = useState(false);

    const [windowWidth, setWindowWidth] = useState(0);
    const [windowCenter, setWindowCenter] = useState(0);

    /* ---------------------------------------------
       Init Cornerstone
    --------------------------------------------- */
    useEffect(() => {
        let mounted = true;

        async function init() {
            if (!elementRef.current) return;

            try {
                const [cornerstone, dicomParser, wadoLoader] = await Promise.all([
                    import("cornerstone-core"),
                    import("dicom-parser"),
                    import("cornerstone-wado-image-loader")
                ]);

                if (!mounted) return;

                const cs = cornerstone.default || cornerstone;
                const parser = dicomParser.default || dicomParser;
                const loader = wadoLoader.default || wadoLoader;

                cornerstoneRef.current = cs;

                loader.external.cornerstone = cs;
                loader.external.dicomParser = parser;
                loader.configure({
                    useWebWorkers: false,
                    decodeConfig: {
                        convertFloatPixelDataToInt: false
                    }
                });

                setIsInitialized(true);
                console.log("✅ Cornerstone инициализирован");

            } catch (err) {
                console.error("❌ Ошибка инициализации:", err);
                setError("Ошибка инициализации библиотеки");
            }
        }

        init();

        return () => {
            mounted = false;

            const cs = cornerstoneRef.current;
            // eslint-disable-next-line react-hooks/exhaustive-deps
            const element = elementRef.current;

            if (cs && element) {
                try {
                    cs.disable(element);
                    console.log("🔴 Element disabled (unmount)");
                } catch (e) {
                    console.warn("Ошибка отключения при unmount:", e);
                }
            }
        };
    }, []);

    /* ---------------------------------------------
       Enable/Disable element based on src
    --------------------------------------------- */
    useEffect(() => {
        const cs = cornerstoneRef.current;
        const element = elementRef.current;

        if (!cs || !element || !isInitialized) return;

        // Если src пустой - disable элемент
        if (!src || src.length === 0) {
            if (isElementEnabled) {
                try {
                    cs.disable(element);
                    setIsElementEnabled(false);
                    console.log("🔴 Element disabled (empty src)");
                } catch (e) {
                    console.warn("Ошибка отключения:", e);
                    setIsElementEnabled(false);
                }
            }
            return;
        }

        // Если src есть - enable элемент (если ещё не enabled)
        if (!isElementEnabled) {
            try {
                // Проверяем, не включен ли уже элемент
                const enabledElements = cs.getEnabledElements();
                const alreadyEnabled = enabledElements.some((e: any) => e.element === element);

                if (!alreadyEnabled) {
                    cs.enable(element);
                    console.log("🟢 Element enabled");
                }

                setIsElementEnabled(true);
            } catch (e) {
                console.error("Ошибка включения элемента:", e);
                // Попробуем снова через небольшую задержку
                setTimeout(() => {
                    try {
                        cs.enable(element);
                        setIsElementEnabled(true);
                        console.log("🟢 Element enabled (retry)");
                    } catch (retryErr) {
                        console.error("Ошибка повторного включения:", retryErr);
                        setError("Не удалось инициализировать просмотрщик");
                    }
                }, 100);
            }
        }
    }, [src, isInitialized, isElementEnabled]);

    /* ---------------------------------------------
       Process DICOM files
    --------------------------------------------- */
    useEffect(() => {
        if (!isInitialized || !src || src.length === 0) {
            setImageIds([]);
            setIndex(0);
            setWindowWidth(0);
            setWindowCenter(0);
            return;
        }

        setError(null);

        try {
            const ids = src.map((url: string) => `wadouri:${url}`);
            console.log(`📁 Загружено ${ids.length} DICOM файлов`);
            setImageIds(ids);
            setIndex(0);
        } catch (err) {
            console.error("❌ Ошибка обработки файлов:", err);
            setError(err instanceof Error ? err.message : "Ошибка обработки файлов");
        }
    }, [src, isInitialized]);

    /* ---------------------------------------------
       Display image
    --------------------------------------------- */
    useEffect(() => {
        const cs = cornerstoneRef.current;
        const element = elementRef.current;

        if (!cs || !element || !imageIds.length || !isElementEnabled) {
            return;
        }

        let mounted = true;

        const checkAndDisplay = async () => {
            try {
                // Проверяем состояние элемента
                const enabledElements = cs.getEnabledElements();
                const isEnabled = enabledElements.some((e: any) => e.element === element);

                if (!isEnabled) {
                    console.warn("⚠️ Element не enabled, пропускаем загрузку");
                    // Попробуем включить
                    try {
                        cs.enable(element);
                        console.log("🟢 Element re-enabled");
                    } catch (e) {
                        console.error("Не удалось включить элемент:", e);
                        setError("Ошибка инициализации просмотра");
                        return;
                    }
                }

                const image = await cs.loadAndCacheImage(imageIds[index]);

                if (!mounted) return;

                const viewport = cs.getDefaultViewportForImage(element, image);

                if (windowWidth === 0) {
                    setWindowWidth(viewport.voi.windowWidth);
                    setWindowCenter(viewport.voi.windowCenter);
                }

                cs.displayImage(element, image);
                console.log(`🖼️ Срез ${index + 1}/${imageIds.length}`);

            } catch (err) {
                if (!mounted) return;
                console.error("❌ Ошибка загрузки/отображения:", err);
                setError(`Ошибка загрузки среза ${index + 1}`);
            }
        };

        checkAndDisplay();

        return () => {
            mounted = false;
        };
    }, [imageIds, index, isElementEnabled, windowWidth]);

    /* ---------------------------------------------
       Manual window adjustment
    --------------------------------------------- */
    useEffect(() => {
        const cs = cornerstoneRef.current;
        const element = elementRef.current;

        if (!cs || !element || windowWidth === 0 || !isElementEnabled) return;

        try {
            // Проверяем что элемент enabled перед использованием
            const enabledElements = cs.getEnabledElements();
            const isEnabled = enabledElements.some((e: any) => e.element === element);

            if (!isEnabled) {
                console.warn("⚠️ Element не enabled, пропускаем настройку viewport");
                return;
            }

            const viewport = cs.getViewport(element);
            if (viewport) {
                viewport.voi.windowWidth = windowWidth;
                viewport.voi.windowCenter = windowCenter;
                cs.setViewport(element, viewport);
            }
        } catch (err) {
            console.error("Ошибка установки viewport:", err);
        }
    }, [windowWidth, windowCenter, isElementEnabled]);

    /* ---------------------------------------------
       Mouse wheel navigation
    --------------------------------------------- */
    useEffect(() => {
        const el = elementRef.current;
        if (!el || !imageIds.length) return;

        function onWheel(e: WheelEvent) {
            e.preventDefault();
            if (e.deltaY > 0) {
                setIndex((i) => Math.min(i + 1, imageIds.length - 1));
            } else {
                setIndex((i) => Math.max(i - 1, 0));
            }
        }

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [imageIds.length]);

    /* ---------------------------------------------
       Keyboard navigation
    --------------------------------------------- */
    useEffect(() => {
        if (!imageIds.length) return;

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "ArrowUp" || e.key === "ArrowRight") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, imageIds.length - 1));
            } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Home") {
                e.preventDefault();
                setIndex(0);
            } else if (e.key === "End") {
                e.preventDefault();
                setIndex(imageIds.length - 1);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [imageIds.length]);

    /* ---------------------------------------------
       Empty state
    --------------------------------------------- */
    if (!src || src.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <svg
                        className="w-10 h-10 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                    КТ-снимки не загружены
                </h3>
                <p className="text-gray-600 text-center max-w-md mb-6">
                    Загрузите DICOM архив с компьютерной томографией для просмотра и анализа снимков
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Используйте кнопку загрузки выше</span>
                </div>
            </div>
        );
    }

    /* ---------------------------------------------
       Render viewer
    --------------------------------------------- */
    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center relative">
                <div
                ref={elementRef}
                className="w-max bg-black select-none border border-gray-700 rounded-lg overflow-hidden"
                style={{
                    imageRendering: 'pixelated',
                    aspectRatio: '1 / 1',
                    minHeight: '400px',
                    maxHeight: '700px',
                    maxWidth: '80svw'
                }}
            />

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-20 p-4">
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md text-center">
                            <div className="font-bold mb-2">Ошибка</div>
                            <div>{error}</div>
                        </div>
                    </div>
                )}

                {!error && imageIds.length > 0 && !isElementEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="text-white text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                            <div>Инициализация просмотра...</div>
                        </div>
                    </div>
                )}
            </div>

            {imageIds.length > 0 && !error && (
                <div className="flex w-full max-w-[80svw] mx-auto flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">
                            Срез: {index + 1} / {imageIds.length}
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                                disabled={index === 0}
                                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                            >
                                ←
                            </button>
                            <input
                                type="range"
                                min="0"
                                max={imageIds.length - 1}
                                value={index}
                                onChange={(e) => setIndex(Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <button
                                onClick={() => setIndex((i) => Math.min(i + 1, imageIds.length - 1))}
                                disabled={index === imageIds.length - 1}
                                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                            >
                                →
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">
                            Контраст: {Math.round(windowWidth)}
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="4000"
                            value={windowWidth}
                            onChange={(e) => setWindowWidth(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">
                            Яркость: {Math.round(windowCenter)}
                        </label>
                        <input
                            type="range"
                            min="-2000"
                            max="2000"
                            value={windowCenter}
                            onChange={(e) => setWindowCenter(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                    </div>

                    <button
                        onClick={() => {
                            const cs = cornerstoneRef.current;
                            const element = elementRef.current;
                            if (cs && element && isElementEnabled) {
                                try {
                                    cs.reset(element);
                                    const viewport = cs.getViewport(element);
                                    if (viewport) {
                                        setWindowWidth(viewport.voi.windowWidth);
                                        setWindowCenter(viewport.voi.windowCenter);
                                    }
                                } catch (e) {
                                    console.error("Ошибка сброса:", e);
                                }
                            }
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                        Сбросить настройки
                    </button>
                </div>
            )}
        </div>
    );
}