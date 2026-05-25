namespace TECAir.Application.DTOs.Planes;

// DTO usado por el frontend administrativo para seleccionar aviones al crear vuelos.
public class PlaneResponse
{
    public string Plate { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Capacity { get; set; }
}
