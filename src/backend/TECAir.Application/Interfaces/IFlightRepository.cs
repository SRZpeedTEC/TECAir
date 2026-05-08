using TECAir.Application.DTOs.Flights;

namespace TECAir.Application.Interfaces;

public interface IFlightRepository
{
    Task<bool> AirportExistsAsync(string airportCode, CancellationToken cancellationToken = default);

    Task<bool> PlaneExistsAsync(string planePlate, CancellationToken cancellationToken = default);

    Task<FlightResponse> CreateAsync(CreateFlightRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OpenFlightResponse>> GetOpenByDepartureAirportAsync(
        string departureCode,
        CancellationToken cancellationToken = default);
}
