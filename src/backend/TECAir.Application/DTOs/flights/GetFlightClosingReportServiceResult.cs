namespace TECAir.Application.DTOs.Flights;

// Resultado del caso de uso de reporte de cierre de vuelo.
public class GetFlightClosingReportServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public string? ErrorMessage { get; private init; }
    public FlightClosingReportResponse? Report { get; private init; }

    public static GetFlightClosingReportServiceResult Success(FlightClosingReportResponse report)
    {
        return new GetFlightClosingReportServiceResult
        {
            IsSuccess = true,
            Report = report
        };
    }

    public static GetFlightClosingReportServiceResult NotFound(string errorMessage)
    {
        return new GetFlightClosingReportServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }
}
