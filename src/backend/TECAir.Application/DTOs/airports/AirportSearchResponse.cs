namespace TECAir.Application.DTOs.Airports;

// DTO de salida para resultados de busqueda de aeropuertos.
// Incluye solo los datos necesarios para que el cliente pueda identificar la opcion.
public class AirportSearchResponse
{
    public string AirportName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}
