using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Storage;

// Implementacion de IPromotionImageStorage que guarda las imagenes en una
// carpeta local servida estaticamente por la API (por defecto
// wwwroot/uploads/promotions). Devuelve la ruta publica relativa.
public sealed class LocalPromotionImageStorage : IPromotionImageStorage
{
    private readonly string _rootPath;
    private readonly string _urlPrefix;

    public LocalPromotionImageStorage(string rootPath, string urlPrefix)
    {
        _rootPath = rootPath;
        _urlPrefix = urlPrefix.EndsWith('/') ? urlPrefix : urlPrefix + "/";
    }

    public async Task<string> SaveAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_rootPath);

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var storedName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(_rootPath, storedName);

        await using (var stream = File.Create(fullPath))
        {
            await content.CopyToAsync(stream, cancellationToken);
        }

        return _urlPrefix + storedName;
    }
}
