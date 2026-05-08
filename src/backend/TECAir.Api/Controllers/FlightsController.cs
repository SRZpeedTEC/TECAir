using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Este controller expone los endpoints HTTP de vuelos.
// La logica de negocio queda en FlightService; aqui solo se traducen resultados
// a respuestas como 201 Created, 400 Bad Request, 404 Not Found o 409 Conflict.
[ApiController]
[Route("api/flights")]
public class FlightsController(IFlightService flightService) : ControllerBase
{
    // POST /api/flights
    // Recibe el DTO del body y delega la creacion al servicio de aplicacion.
    [HttpPost]
    public async Task<ActionResult<FlightResponse>> Create(
        CreateFlightRequest request,
        CancellationToken cancellationToken)
    {
        var result = await flightService.CreateAsync(request, cancellationToken);
        if (!result.IsSuccess)
        {
            if (result.IsNotFound)
            {
                return NotFound(new { message = result.ErrorMessage });
            }

            if (result.IsConflict)
            {
                return Conflict(new { message = result.ErrorMessage });
            }

            return BadRequest(new { message = result.ErrorMessage });
        }

        return Created($"/api/flights/{result.Flight!.FlightId}", result.Flight);
    }

    // GET /api/flights/open
    // Consulta vuelos disponibles por aeropuerto de salida usando query string.
    [HttpGet("open")]
    public async Task<ActionResult<IReadOnlyList<OpenFlightResponse>>> GetOpenByDepartureAirport(
        [FromQuery] string? departureCode,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(departureCode))
        {
            return BadRequest(new { message = "Query parameter 'departureCode' is required." });
        }

        var flights = await flightService.GetOpenByDepartureAirportAsync(departureCode, cancellationToken);
        return Ok(flights);
    }
}
