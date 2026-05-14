using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Security;

// Implementacion concreta de hashing con BCrypt. Al estar centralizada, los
// servicios piden una interfaz y ningun flujo guarda passwords en texto plano.
public class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public bool Verify(string password, string passwordHash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch (BCrypt.Net.HashInformationException)
        {
            // Si existen datos antiguos con un valor que no es BCrypt, el login
            // debe fallar como credenciales invalidas y no como error interno.
            return false;
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }
}
