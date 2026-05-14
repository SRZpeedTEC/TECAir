namespace TECAir.Application.DTOs.Flights;

// Resultado del borrado de vuelo.
// Se usa para separar reglas de negocio de la traduccion a HTTP.
public class DeleteFlightServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }

    public static DeleteFlightServiceResult Success()
    {
        return new DeleteFlightServiceResult
        {
            IsSuccess = true
        };
    }

    public static DeleteFlightServiceResult NotFound(string errorMessage)
    {
        return new DeleteFlightServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static DeleteFlightServiceResult Conflict(string errorMessage)
    {
        return new DeleteFlightServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
