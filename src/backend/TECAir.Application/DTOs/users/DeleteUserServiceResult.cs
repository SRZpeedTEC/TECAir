namespace TECAir.Application.DTOs.Users;

// Resultado del borrado de usuario.
// El servicio comunica el motivo del fallo y el controller decide el codigo HTTP.
public class DeleteUserServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }

    public static DeleteUserServiceResult Success()
    {
        return new DeleteUserServiceResult
        {
            IsSuccess = true
        };
    }

    public static DeleteUserServiceResult NotFound(string errorMessage)
    {
        return new DeleteUserServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static DeleteUserServiceResult Conflict(string errorMessage)
    {
        return new DeleteUserServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
