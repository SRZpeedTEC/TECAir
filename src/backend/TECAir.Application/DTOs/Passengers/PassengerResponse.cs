using System.Text.Json.Serialization;

namespace TECAir.Application.DTOs.Passengers;

// DTO devuelto por la API despues de crear un pasajero.
public class PassengerResponse
{
    public string PassportId { get; set; } = string.Empty;
    public DateOnly Birthday { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public string Lname { get; set; } = string.Empty;
}
