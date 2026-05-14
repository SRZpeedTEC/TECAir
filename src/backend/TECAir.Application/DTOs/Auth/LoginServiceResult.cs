namespace TECAir.Application.DTOs.Auth;

// Comunica el resultado del login sin acoplar el servicio a codigos HTTP.
// El controller traduce estos flags a 200, 400 o 401.
public class LoginServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsUnauthorized { get; private init; }
    public bool IsValidationError { get; private init; }
    public string? ErrorMessage { get; private init; }
    public LoginResponse? User { get; private init; }

    public static LoginServiceResult Success(LoginResponse response)
    {
        return new LoginServiceResult
        {
            IsSuccess = true,
            User = response
        };
    }

    public static LoginServiceResult Unauthorized(string errorMessage)
    {
        return new LoginServiceResult
        {
            IsUnauthorized = true,
            ErrorMessage = errorMessage
        };
    }

    public static LoginServiceResult ValidationError(string errorMessage)
    {
        return new LoginServiceResult
        {
            IsValidationError = true,
            ErrorMessage = errorMessage
        };
    }
}
