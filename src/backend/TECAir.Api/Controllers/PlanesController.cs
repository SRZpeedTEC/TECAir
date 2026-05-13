using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Planes;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Controller para consultar aviones disponibles desde el frontend administrativo.
// Solo recibe el filtro HTTP y delega la busqueda al servicio de aplicacion.
[ApiController]
[Route("api/planes")]
public class PlanesController(IPlaneService planeService) : ControllerBase
{
    // GET /api/planes?plate=...
    // La placa es opcional: sin filtro se devuelven todos los aviones registrados.
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PlaneResponse>>> Search(
        [FromQuery] string? plate,
        CancellationToken cancellationToken)
    {
        var planes = await planeService.SearchAsync(plate, cancellationToken);
        return Ok(planes);
    }
}
