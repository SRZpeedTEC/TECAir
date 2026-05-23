namespace TECAir.Application.Interfaces;

// Contrato que aisla el almacenamiento fisico de imagenes de promociones de la
// capa de aplicacion. La implementacion concreta vive en Infrastructure y
// decide donde escribe el archivo (filesystem local, S3, etc).
public interface IPromotionImageStorage
{
    // Persiste el contenido y devuelve la ruta publica relativa
    // (ej. "/uploads/promotions/<archivo>"). El controller compone la URL
    // absoluta antes de responder al cliente.
    Task<string> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);
}
