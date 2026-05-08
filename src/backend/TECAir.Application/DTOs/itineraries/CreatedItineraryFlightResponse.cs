namespace TECAir.Application.DTOs.Itineraries;

// DTO de salida para cada vuelo agregado durante la creacion de un itinerario.
// Incluye el id de la relacion y el orden guardado en la base.
public class CreatedItineraryFlightResponse
{
    public int ItineraryFlightId { get; set; }
    public int FlightId { get; set; }
    public int FlightOrder { get; set; }
}
