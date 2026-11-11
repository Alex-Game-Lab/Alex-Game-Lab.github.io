export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 0,
    public requestId?: string,
  ) {
    super(code);
  }
}
export function errorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "unavailable";
  return (
    (
      {
        permission_denied: "Для этого действия нет разрешения.",
        recent_confirmation_required:
          "Подтверди действие паролем и повтори сохранение.",
        recent_mfa_required: "Подтверди действие паролем и повтори сохранение.",
        revision_conflict:
          "Запись уже изменена в другой вкладке. Твои изменения сохранены в редакторе: обнови серверную версию перед повторной записью.",
        owner_content_protected: "Этот материал защищён владельцем AGL.",
        owner_account_protected: "Аккаунт владельца защищён.",
        privileged_account_protected:
          "Изменить этот аккаунт может только Owner.",
        account_restricted:
          "Доступ к аккаунту ограничен администратором.",
        confirmation_mismatch: "Подтверждение не совпало с выбранной записью.",
        account_deleted: "Аккаунт находится в корзине. Доступ к API закрыт до восстановления администратором.",
        self_deletion_forbidden: "Нельзя удалить аккаунт текущего сотрудника.",
        system_role_protected: "Системную роль удалить нельзя. Можно изменить её разрешения.",
        already_deleted: "Запись уже находится в корзине. Обнови список.",
        publication_requires_admin: "Для публикации нужно отдельное право на этот проект.",
        authentication_required: "Войди в аккаунт, чтобы продолжить.",
        delegation_ceiling: "Admin может управлять только младшими ролями.",
        owner_is_not_assignable:
          "Owner закреплён за владельцем и не назначается как роль.",
        owner_required: "Это действие доступно владельцу AGL.",
        role_exists: "Такой адрес роли уже занят.",
        role_is_system_or_assigned:
          "Нельзя удалить системную роль или роль, которая назначена участникам.",
        unknown_permission: "Одно из прав больше недоступно. Обнови список.",
        media_not_published:
          "Сначала сделай изображение доступным на сайте в медиатеке.",
        invalid_image:
          "Не удалось прочитать изображение. Выбери PNG, JPG или WebP.",
        image_too_large: "Изображение слишком большое. Уменьши его размер.",
        validation_error: "Проверь заполненные поля.",
        not_found: "Запись не найдена или недоступна.",
        slug_exists: "Такой адрес проекта уже занят.",
        project_is_immutable:
          "Изменить проект у этой статьи может только Owner.",
        expiry_must_be_future: "Укажи дату окончания в будущем.",
        project_membership_not_allowed_by_role: "Эта роль не позволяет назначить аккаунт выбранным участником проекта.",
        save_revision_conflict: "Игра или другой сотрудник уже изменили сохранение. Обнови данные и повтори правку.",
        invalid_rublemet_save: "Сохранение содержит некорректные данные игры.",
        testing_save_not_allowed: "Тестовый прогресс нельзя записать в обычное сохранение.",
        use_save_editor: "Измени реальные данные во вкладке сохранений игрока.",
        stats_out_of_range: "Изменение выходит за допустимые границы.",
        operation_id_conflict: "Операция с таким номером уже выполнена.",
      } as Record<string, string>
    )[code] || "Не удалось связаться с сервисом. Попробуй ещё раз."
  );
}
