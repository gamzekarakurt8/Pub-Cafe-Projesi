using System.Security.Cryptography;
using System.Text;

namespace CafeUygulamasi.Services
{
	public static class PasswordHasher
	{
		private const int Iterations = 100_000;
		private const int SaltSize = 16;
		private const int KeySize = 32;

		public static string Hash(string password)
		{
			using var rng = RandomNumberGenerator.Create();
			var salt = new byte[SaltSize];
			rng.GetBytes(salt);

			using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
			var key = pbkdf2.GetBytes(KeySize);

			return $"PBKDF2${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
		}

		public static bool Verify(string password, string hash)
		{
			if (string.IsNullOrWhiteSpace(hash))
				return false;

			var parts = hash.Split('$');
			if (parts.Length != 4 || parts[0] != "PBKDF2")
				return false;

			if (!int.TryParse(parts[1], out var iterations))
				return false;

			var salt = Convert.FromBase64String(parts[2]);
			var expected = Convert.FromBase64String(parts[3]);

			using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
			var actual = pbkdf2.GetBytes(expected.Length);

			return CryptographicOperations.FixedTimeEquals(actual, expected);
		}
	}
}
