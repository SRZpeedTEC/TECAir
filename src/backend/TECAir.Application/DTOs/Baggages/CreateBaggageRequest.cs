namespace TECAir.Application.DTOs.Baggages;

// DTO que representa el JSON recibido para crear una maleta.
public class CreateBaggageRequest
{
    public int ConfirmationNumber { get; set; }
    public decimal Weight { get; set; }
    public string Color { get; set; } = string.Empty;
}
