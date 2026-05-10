using System.Text.Json.Serialization;

namespace TECAir.Application.DTOs.Passengers;

// DTO que representa el JSON recibido para registrar un pasajero.
public class CreatePassengerRequest
{
    public string PassportId { get; set; } = string.Empty;
    public DateOnly Birthday { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public string Lname { get; set; } = string.Empty;
}
