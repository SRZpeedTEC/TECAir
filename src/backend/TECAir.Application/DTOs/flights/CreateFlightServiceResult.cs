namespace TECAir.Application.DTOs.Flights;

public class CreateFlightServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public string? ErrorMessage { get; private init; }
    public FlightResponse? Flight { get; private init; }

    public static CreateFlightServiceResult Success(FlightResponse flight)
    {
        return new CreateFlightServiceResult
        {
            IsSuccess = true,
            Flight = flight
        };
    }

    public static CreateFlightServiceResult ValidationError(string errorMessage)
    {
        return new CreateFlightServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static CreateFlightServiceResult NotFound(string errorMessage)
    {
        return new CreateFlightServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }
}
