namespace TECAir.Application.DTOs.Itineraries;

// DTO de salida para resultados resumidos de busqueda de itinerarios.
// Muestra origen, destino, cantidad de vuelos y horario total de la ruta.
public class ItinerarySearchResponse
{
    public int ItineraryId { get; set; }
    public decimal Price { get; set; }
    public string State { get; set; } = string.Empty;
    public string OriginCode { get; set; } = string.Empty;
    public string DestinationCode { get; set; } = string.Empty;
    public int TotalFlights { get; set; }
    public int TotalMiles { get; set; }
    public DateTime DepartureDatetime { get; set; }
    public DateTime ArrivalDatetime { get; set; }
}
