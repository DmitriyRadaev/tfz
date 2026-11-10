import {useCreatePatient} from "@/features/patient/model/useCreatePatient";
import {Button} from "@/shared/ui/Button";
import {SelectItem} from "@/shared/ui/Select";
import {Form} from "@/shared/ui/Form";
import {TextFieldController, DatePickerController, SelectController} from "@/shared/ui/FormFields";
import {CreatePatient} from "@/shared/api/patientApi";

export function CreatePatientForm({closeModal}: { closeModal: () => void }) {

    const {
        control,
        errors,
        handleSubmit,
        isSubmitting
    } = useCreatePatient({closeModal})

    return (
        <div>
            <h3 className="text-xl font-bold mb-4">Добавить пациента</h3>
            <Form className="space-y-4" onSubmit={handleSubmit}>

                <TextFieldController<CreatePatient>
                    name="surname"
                    control={control}
                    errors={errors}
                    label="Фамилия"
                    placeholder="Фамилия пациента"
                    isRequired
                />

                <TextFieldController<CreatePatient>
                    name="name"
                    control={control}
                    errors={errors}
                    label="Имя"
                    placeholder="Имя пациента"
                    isRequired
                />

                <TextFieldController<CreatePatient>
                    name="patronymic"
                    control={control}
                    errors={errors}
                    label="Отчество"
                    placeholder="Отчество пациента, если есть"
                />

                <DatePickerController<CreatePatient>
                    name="birth_date"
                    control={control}
                    errors={errors}
                    label="Дата рождения"
                    isRequired
                />

                <SelectController<CreatePatient>
                    name="gender"
                    control={control}
                    errors={errors}
                    label="Пол"
                    placeholder="Выберите пол"
                    isRequired
                >
                    <SelectItem id="0">Мужской</SelectItem>
                    <SelectItem id="1">Женский</SelectItem>
                </SelectController>

                <div className="flex w-full justify-end gap-3">
                    <Button
                        onPress={closeModal}
                        variant="secondary"
                        isDisabled={isSubmitting}
                    >
                        Отмена
                    </Button>

                    <Button
                        type="submit"
                        isPending={isSubmitting}
                        isDisabled={isSubmitting}
                    >
                        {isSubmitting ? "" : "Добавить пациента"}
                    </Button>
                </div>

            </Form>
        </div>
    )
}