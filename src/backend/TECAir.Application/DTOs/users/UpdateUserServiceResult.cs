namespace TECAir.Application.DTOs.Users;

// Resultado del caso de uso de actualizacion de usuario.
// Permite distinguir validaciones, faltantes y conflictos sin acoplar el servicio a HTTP.
public class UpdateUserServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public UserResponse? User { get; private init; }

    public static UpdateUserServiceResult Success(UserResponse user)
    {
        return new UpdateUserServiceResult
        {
            IsSuccess = true,
            User = user
        };
    }

    public static UpdateUserServiceResult ValidationError(string errorMessage)
    {
        return new UpdateUserServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateUserServiceResult NotFound(string errorMessage)
    {
        return new UpdateUserServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateUserServiceResult Conflict(string errorMessage)
    {
        return new UpdateUserServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
