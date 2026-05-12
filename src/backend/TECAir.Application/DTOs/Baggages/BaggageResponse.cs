namespace TECAir.Application.DTOs.Baggages;

// DTO que representa una maleta expuesta por la API.
public class BaggageResponse
{
    public int BagNumber { get; set; }
    public int ConfirmationNumber { get; set; }
    public decimal Weight { get; set; }
    public string Color { get; set; } = string.Empty;
}
