using Microsoft.AspNetCore.Mvc;
using Npgsql;
using TECAir.Application.DTOs.Users;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Este controller es la capa de entrada HTTP.
// Su responsabilidad es recibir requests, llamar al servicio y traducir el resultado
// a respuestas HTTP como 200 OK, 201 Created, 400 Bad Request o 404 Not Found.
[ApiController]
[Route("users")]
public class UsersController(IUserService userService) : ControllerBase
{
    // GET /users/{email}
    // Busca un usuario por correo. El controller no consulta la base directamente:
    // delega la busqueda al servicio de aplicacion.
    [HttpGet("{email}")]
    public async Task<ActionResult<UserResponse>> GetByEmail(
        string email,
        CancellationToken cancellationToken)
    {
        var user = await userService.GetByEmailAsync(email, cancellationToken);

        if (user is null)
        {
            return NotFound(new { message = $"User '{email}' was not found." });
        }

        return Ok(user);
    }

    // POST /users
    // Crea un usuario nuevo a partir del JSON enviado en el body.
    // Las validaciones de negocio viven en UserService; aqui solo se decide
    // que codigo HTTP devolver segun el resultado.
    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await userService.CreateAsync(request, cancellationToken);
            if (!result.IsSuccess)
            {
                // Si el servicio detecto datos invalidos, se responde 400.
                return BadRequest(new { message = result.ErrorMessage });
            }

            // Si se creo correctamente, se responde 201 e incluimos la ruta del recurso creado.
            return Created($"/users/{Uri.EscapeDataString(result.User!.Email)}", result.User);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            // PostgreSQL envia UniqueViolation cuando se repite una llave unica,
            // por ejemplo el email del usuario o el carnet del estudiante.
            return Conflict(new { message = "A user with that email or student carnet already exists." });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.CheckViolation)
        {
            // PostgreSQL envia CheckViolation cuando se rompe una restriccion CHECK,
            // por ejemplo un rol que no sea CLIENT o ADMIN.
            return BadRequest(new { message = "The user data violates a database constraint." });
        }
    }
}
