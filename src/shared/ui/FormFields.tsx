import { Controller, Control, FieldErrors, FieldValues, Path } from "react-hook-form";
import { TextField as AriaTextField } from "@/shared/ui/TextField";
import { Select as AriaSelect } from "@/shared/ui/Select";
import { DatePicker as AriaDatePicker } from "@/shared/ui/DataPicker";
import { parseDate } from "@internationalized/date";

// Wrapper для TextField
type TextFieldControllerProps<T extends FieldValues> = {
    name: Path<T>;
    control: Control<T>;
    errors: FieldErrors<T>;
    label: string;
    placeholder?: string;
    isRequired?: boolean;
};

export function TextFieldController<T extends FieldValues>({
                                                               name,
                                                               control,
                                                               errors,
                                                               label,
                                                               placeholder,
                                                               isRequired = false,
                                                           }: TextFieldControllerProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            rules={{ required: isRequired ? `${label} обязательно` : false }}
            render={({ field }) => (
                <AriaTextField
                    {...field}
                    label={label}
                    placeholder={placeholder}
                    isRequired={isRequired}
                    isInvalid={!!errors[name]}
                    errorMessage={errors[name]?.message as string}
                />
            )}
        />
    );
}

// Wrapper для DatePicker
type DatePickerControllerProps<T extends FieldValues> = {
    name: Path<T>;
    control: Control<T>;
    errors: FieldErrors<T>;
    label: string;
    isRequired?: boolean;
};

export function DatePickerController<T extends FieldValues>({
                                                                name,
                                                                control,
                                                                errors,
                                                                label,
                                                                isRequired = false,
                                                            }: DatePickerControllerProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            rules={{ required: isRequired ? `${label} обязательно` : false }}
            render={({ field: { onChange, value, ...field } }) => (
                <AriaDatePicker
                    {...field}
                    label={label}
                    isRequired={isRequired}
                    value={value ? parseDate(value) : null}
                    onChange={(date) => {
                        onChange(date ? date.toString() : "");
                    }}
                    isInvalid={!!errors[name]}
                    errorMessage={errors[name]?.message as string}
                />
            )}
        />
    );
}

// Wrapper для Select
type SelectControllerProps<T extends FieldValues> = {
    name: Path<T>;
    control: Control<T>;
    errors: FieldErrors<T>;
    label: string;
    placeholder?: string;
    isRequired?: boolean;
    children: React.ReactNode;
};

export function SelectController<T extends FieldValues>({
                                                            name,
                                                            control,
                                                            errors,
                                                            label,
                                                            placeholder,
                                                            isRequired = false,
                                                            children,
                                                        }: SelectControllerProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            rules={{ required: isRequired ? `${label} обязательно` : false }}
            render={({ field: { onChange, value, ...field } }) => (
                <AriaSelect
                    {...field}
                    label={label}
                    placeholder={placeholder}
                    isRequired={isRequired}
                    value={value !== undefined && value !== null ? value.toString() : undefined}
                    onChange={(selectedValue) => {
                        onChange(selectedValue !== null ? Number(selectedValue) : null);
                    }}
                    isInvalid={!!errors[name]}
                    errorMessage={errors[name]?.message as string}
                >
                    {children}
                </AriaSelect>
            )}
        />
    );
}