using TECAir.Application.DTOs.Flights;

namespace TECAir.Application.Interfaces;

public interface IFlightService
{
    Task<CreateFlightServiceResult> CreateAsync(
        CreateFlightRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OpenFlightResponse>> GetOpenByDepartureAirportAsync(
        string departureCode,
        CancellationToken cancellationToken = default);
}
