namespace TECAir.Application.DTOs.Itineraries;

// DTO recibido para actualizar un itinerario.
// ItineraryId se toma de la ruta para impedir que la llave primaria sea editable.
public class UpdateItineraryRequest
{
    public decimal Price { get; set; }
    public string State { get; set; } = "EDITION";
    public List<CreateItineraryFlightRequest> Flights { get; set; } = [];
}
