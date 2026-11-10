"use client";

import { useForm } from "react-hook-form";

import { useCreatePatientMutation } from "@/entities/patient";
import type { CreatePatient } from "@/shared/api/patientApi";

export function useCreatePatient({ closeModal }: { closeModal: () => void }) {
    const {
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<CreatePatient>({
        defaultValues: {
            name: "",
            surname: "",
            patronymic: "",
            birth_date: "",
            gender: 0,
        },
    });

    const createPatientMutation = useCreatePatientMutation({
        onSuccessActions: [closeModal],
    });

    return {
        control,
        errors,
        handleSubmit: handleSubmit((data) => createPatientMutation.mutate(data)),
        isSubmitting: createPatientMutation.isPending,
    };
}
