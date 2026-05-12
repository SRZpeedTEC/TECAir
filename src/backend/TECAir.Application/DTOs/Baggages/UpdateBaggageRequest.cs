namespace TECAir.Application.DTOs.Baggages;

// DTO que representa el JSON recibido para actualizar una maleta.
// No incluye bagNumber ni confirmationNumber porque no son editables en este caso de uso.
public class UpdateBaggageRequest
{
    public decimal Weight { get; set; }
    public string Color { get; set; } = string.Empty;
}
