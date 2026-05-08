namespace TECAir.Application.DTOs.Itineraries;

// DTO que representa un vuelo dentro del request para crear itinerarios.
// FlightOrder define la posicion del vuelo dentro de la ruta.
public class CreateItineraryFlightRequest
{
    public int FlightId { get; set; }
    public int FlightOrder { get; set; }
}
