"use client";

import { useCreateCaseForm } from "../model/useCreateCase";
import {
    Label,
    TextField,
    Input,
    Checkbox,
    Radio,
    RadioGroup,
    Separator,
    Form,
} from "react-aria-components";
import { Control, Controller } from "react-hook-form";
import { Button } from "@/shared/ui/Button";
import clsx from "clsx";
import { CalculateData } from "@/shared/api/caseApi";

interface CreateCaseFormProps {
    closeModal: () => void;
    idPatient: number;
}

type NumberFieldConfig = {
    name:
        | "thyroid_volume"
        | "st4"
        | "ttg"
        | "atrttg"
        | "eop_stage"
        | "thyrostatic_daily_dose_mg"
        | "thyrostatic_therapy_duration_months";
    label: string;
    placeholder: string;
    step: string;
    min: number;
};

type CheckboxFieldConfig = {
    name:
        | "ccc_complications"
        | "compression_syndrome"
        | "slco1b1_polymorphism"
        | "multiple_thyroid_nodules";
    label: string;
};

const labFields: NumberFieldConfig[] = [
    { name: "st4", label: "сТ4 (нг/дл)", placeholder: "1.5", step: "0.01", min: 0.01 },
    { name: "ttg", label: "ТТГ (мкМЕ/мл)", placeholder: "0.01", step: "0.01", min: 0.01 },
    { name: "atrttg", label: "АтрТТГ (МЕ/л)", placeholder: "12.8", step: "0.01", min: 0.01 },
];

const clinicalFields: NumberFieldConfig[] = [
    { name: "eop_stage", label: "Эндокринная офтальмопатия (стадия 0-3)", placeholder: "Например, 1", step: "1", min: 0 },
    { name: "thyrostatic_daily_dose_mg", label: "Суточная доза тиреостатиков (мг/сут)", placeholder: "30", step: "0.1", min: 0 },
];

const durationField: NumberFieldConfig = {
    name: "thyrostatic_therapy_duration_months",
    label: "Длительность тиреостатической терапии (мес.)",
    placeholder: "6",
    step: "1",
    min: 0,
};

const checkboxFields: CheckboxFieldConfig[] = [
    { name: "ccc_complications", label: "Осложнения со стороны ССС" },
    { name: "compression_syndrome", label: "Компрессионный синдром" },
    { name: "slco1b1_polymorphism", label: "Полиморфизм гена SLCO1B1" },
    { name: "multiple_thyroid_nodules", label: "Множественные узлы в ЩЖ (> 10 мм)" },
];

const cardClass = "border border-blue-200 p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-blue-100/50 shadow-md";
const headingClass = "text-xl font-bold mb-5 text-[#006CB4] border-b-2 border-blue-300 pb-3 flex items-center gap-2";
const inputBaseClass = "h-11 px-4 rounded-lg border-2 border-gray-300 bg-white w-full focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-900 placeholder:text-gray-400";
const inputErrorClass = "border-red-400 focus:border-red-500 focus:ring-red-200";
const checkboxBoxClass = "w-6 h-6 rounded-md border-2 border-blue-400 bg-white flex items-center justify-center group-hover:border-blue-500 group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-blue-300 group-data-[selected]:bg-blue-600 group-data-[selected]:border-blue-600 transition-all duration-200 flex-shrink-0 mt-0.5";

function NumberFieldController({
                                   fieldConfig,
                                   control,
                                   isRequired = true,
                                   className,
                               }: {
    fieldConfig: NumberFieldConfig;
    control: Control<CalculateData>;
    isRequired?: boolean;
    className?: string;
}) {
    const { name, label, placeholder, step, min } = fieldConfig;
    return (
        <Controller<CalculateData>
            name={name}
            control={control}
            rules={{
                required: isRequired ? "Обязательное поле" : false,
                min: { value: min, message: "Введите корректное значение" },
            }}
            render={({ field, fieldState }) => (
                <TextField isInvalid={!!fieldState.error} className={className}>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2">
                        {label}
                        {isRequired && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        type="number"
                        step={step}
                        onKeyDown={(e) => e.key === "-" && e.preventDefault()}
                        // Колесо мыши над сфокусированным number-полем меняет
                        // значение — при прокрутке длинной формы это молча
                        // искажало бы уже введённые показатели.
                        onWheel={(event) => event.currentTarget.blur()}
                        value={
                            typeof field.value === "number" || typeof field.value === "string"
                                ? field.value
                                : ""
                        }
                        onChange={(e) =>
                            field.onChange(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder={placeholder}
                        className={clsx(inputBaseClass, fieldState.error && inputErrorClass)}
                    />
                    {fieldState.error && (
                        <span className="text-xs text-red-500 mt-1">{fieldState.error.message}</span>
                    )}
                </TextField>
            )}
        />
    );
}

export function CreateCaseForm({ closeModal, idPatient }: CreateCaseFormProps) {
    const { control, handleSubmit, isSubmitting, isMtz } = useCreateCaseForm({
        closeModal,
        idPatient,
    });

    return (
        <div className="w-full max-w-4xl relative">

            {/* Заголовок */}
            <div className="flex w-full items-center mb-6">
                <h2 className="text-2xl font-bold">Добавление приема</h2>
                <button
                    onClick={closeModal}
                    className="flex justify-center items-center ml-auto w-10 h-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    aria-label="Закрыть"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <Form className="flex flex-col gap-6" onSubmit={handleSubmit}>

                {/* ========== БАЗОВЫЕ ДАННЫЕ ========== */}
                <div className={cardClass}>
                    <h3 className={headingClass}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        Базовые данные пациента
                    </h3>
                    <Separator className="text-blue-200 my-5" />

                    <NumberFieldController
                        fieldConfig={{ name: "thyroid_volume", label: "Объем щитовидной железы (мл)", placeholder: "Например, 18.5", step: "0.1", min: 0.1 }}
                        control={control}
                    />
                </div>

                {/* ========== ЛАБОРАТОРНЫЕ ПОКАЗАТЕЛИ ========== */}
                <div className={cardClass}>
                    <h3 className={headingClass}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        Лабораторные показатели
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {labFields.map((f) => (
                            <NumberFieldController key={f.name} fieldConfig={f} control={control} />
                        ))}
                    </div>
                </div>

                {/* ========== КЛИНИЧЕСКИЕ ФАКТОРЫ ========== */}
                <div className={cardClass}>
                    <h3 className={headingClass}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Клинические факторы и терапия
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                        {clinicalFields.map((f) => (
                            <NumberFieldController key={f.name} fieldConfig={f} control={control} />
                        ))}
                    </div>

                    <NumberFieldController fieldConfig={durationField} control={control} className="mb-5" />

                    <Separator className="text-blue-200 my-5" />

                    {/* Чекбоксы */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {checkboxFields.map(({ name, label }) => (
                            <Controller<CalculateData>
                                key={name}
                                name={name}
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        isSelected={!!field.value}
                                        onChange={field.onChange}
                                        className="flex items-start gap-3 group"
                                    >
                                        <div className={checkboxBoxClass}>
                                            <svg
                                                className="w-4 h-4 text-white opacity-0 group-data-[selected]:opacity-100"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-700 font-medium cursor-pointer leading-tight">
                                            {label}
                                        </span>
                                    </Checkbox>
                                )}
                            />
                        ))}
                    </div>

                    {/*
                     * Локализация узлов спрашивается только при МТЗ и прямо
                     * определяет объём операции: узлы в обеих долях не
                     * оставляют места для органосохраняющей резекции.
                     */}
                    {isMtz && (
                        <>
                            <Separator className="text-blue-200 my-5" />
                            <Controller<CalculateData>
                                name="nodules_bilateral"
                                control={control}
                                rules={{
                                    validate: (value) =>
                                        typeof value === "boolean" ||
                                        "Укажите локализацию узлов",
                                }}
                                render={({ field, fieldState }) => (
                                    <RadioGroup
                                        value={
                                            field.value === true
                                                ? "bilateral"
                                                : field.value === false
                                                  ? "unilateral"
                                                  : null
                                        }
                                        onChange={(value) =>
                                            field.onChange(value === "bilateral")
                                        }
                                        isInvalid={!!fieldState.error}
                                    >
                                        <Label className="mb-3 flex items-center gap-1 text-sm font-semibold text-gray-700">
                                            Локализация узлов{" "}
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex flex-col gap-4 sm:flex-row">
                                            {[
                                                {
                                                    value: "bilateral",
                                                    title: "Узлы в обеих долях ЩЖ",
                                                    hint: "Множественные узлы с двух сторон",
                                                },
                                                {
                                                    value: "unilateral",
                                                    title: "Узлы только в одной доле ЩЖ",
                                                    hint: "Узлы сосредоточены в одной доле",
                                                },
                                            ].map((option) => (
                                                <Radio
                                                    key={option.value}
                                                    value={option.value}
                                                    className="group flex cursor-pointer items-start gap-3"
                                                >
                                                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-brand-300 bg-white transition-all duration-200 group-hover:border-brand-400 group-data-[selected]:border-brand-500 group-data-[selected]:bg-brand-500">
                                                        <div className="h-2 w-2 rounded-full bg-white opacity-0 group-data-[selected]:opacity-100" />
                                                    </div>
                                                    <div className="leading-tight">
                                                        <span className="font-medium text-gray-700">
                                                            {option.title}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-gray-500">
                                                            {option.hint}
                                                        </span>
                                                    </div>
                                                </Radio>
                                            ))}
                                        </div>
                                        {fieldState.error && (
                                            <p className="mt-2 text-xs font-medium text-red-500">
                                                {fieldState.error.message}
                                            </p>
                                        )}
                                    </RadioGroup>
                                )}
                            />
                        </>
                    )}
                </div>

                {/* ========== КНОПКИ ========== */}
                <div className="flex w-full justify-end gap-3">
                    <Button onPress={closeModal} variant="secondary" isDisabled={isSubmitting}>
                        Отмена
                    </Button>
                    <Button type="submit" isPending={isSubmitting} isDisabled={isSubmitting}>
                        {isSubmitting ? "" : "Добавить прием"}
                    </Button>
                </div>

            </Form>
        </div>
    );
}