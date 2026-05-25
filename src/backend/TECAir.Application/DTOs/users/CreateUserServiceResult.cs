namespace TECAir.Application.DTOs.Users;

// Este objeto comunica el resultado del servicio hacia el controller.
// Asi el servicio puede decir "fallo por validacion" sin conocer detalles HTTP
// como BadRequest, Created o Conflict.
public class CreateUserServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public UserResponse? User { get; private init; }

    // Resultado exitoso: se envia el usuario que ya fue creado y leido desde la base.
    public static CreateUserServiceResult Success(UserResponse user)
    {
        return new CreateUserServiceResult
        {
            IsSuccess = true,
            User = user
        };
    }

    // Resultado fallido por validacion: se envia un mensaje entendible para la API.
    public static CreateUserServiceResult ValidationError(string errorMessage)
    {
        return new CreateUserServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    // Resultado fallido por conflicto de datos unicos antes de escribir en base.
    public static CreateUserServiceResult Conflict(string errorMessage)
    {
        return new CreateUserServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
