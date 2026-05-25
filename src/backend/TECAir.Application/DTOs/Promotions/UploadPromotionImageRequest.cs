namespace TECAir.Application.DTOs.Promotions;

// DTO que representa la imagen recibida para subir.
// Se construye en el controller a partir del IFormFile y se pasa al servicio
// para que la capa de aplicacion no dependa de tipos de ASP.NET.
public class UploadPromotionImageRequest
{
    public Stream Content { get; set; } = Stream.Null;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Length { get; set; }
}
