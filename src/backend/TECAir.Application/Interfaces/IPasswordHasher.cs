namespace TECAir.Application.Interfaces;

// Centraliza el hashing de contrasenas para que la aplicacion nunca guarde
// passwords en texto plano ni repita esa decision de seguridad en varios servicios.
public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string passwordHash);
}
