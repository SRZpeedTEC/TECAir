using Microsoft.AspNetCore.Mvc;
using TECAir.Application.DTOs.Users;
using TECAir.Application.Interfaces;

namespace TECAir.Api.Controllers;

// Este controller es la capa de entrada HTTP.
// Su responsabilidad es recibir requests, llamar al servicio y traducir el resultado
// a respuestas HTTP como 200 OK, 201 Created, 400 Bad Request o 404 Not Found.
[ApiController]
[Route("users")]
[Route("api/users")]
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
        var result = await userService.CreateAsync(request, cancellationToken);
        if (!result.IsSuccess)
        {
            if (result.IsConflict)
            {
                return Conflict(new { message = result.ErrorMessage });
            }

            // Si el servicio detecto datos invalidos, se responde 400.
            return BadRequest(new { message = result.ErrorMessage });
        }

        // Si se creo correctamente, se responde 201 e incluimos la ruta del recurso creado.
        return Created($"/users/{Uri.EscapeDataString(result.User!.Email)}", result.User);
    }

    // PUT /api/users/{email}
    // Actualiza datos editables. El email viene de la ruta para no modificar la llave primaria.
    [HttpPut("{email}")]
    public async Task<ActionResult<UserResponse>> Update(
        string email,
        UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        var result = await userService.UpdateAsync(email, request, cancellationToken);
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

        return Ok(result.User);
    }

    // DELETE /api/users/{email}
    // Elimina la cuenta si no existen reservaciones que deban conservar historial.
    [HttpDelete("{email}")]
    public async Task<IActionResult> Delete(
        string email,
        CancellationToken cancellationToken)
    {
        var result = await userService.DeleteAsync(email, cancellationToken);
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
        }

        return NoContent();
    }
}
