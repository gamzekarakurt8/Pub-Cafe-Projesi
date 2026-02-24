using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace CafeUygulamasi.Data
{
	public class CafeDbContextFactory : IDesignTimeDbContextFactory<CafeDbContext>
	{
		public CafeDbContext CreateDbContext(string[] args)
		{
			var configuration = new ConfigurationBuilder()
				.SetBasePath(Directory.GetCurrentDirectory())
				.AddJsonFile("appsettings.json", optional: false)
				.AddJsonFile("appsettings.Development.json", optional: true)
				.AddEnvironmentVariables()
				.Build();

			var connectionString = configuration.GetConnectionString("Default");
			if (string.IsNullOrWhiteSpace(connectionString))
				throw new InvalidOperationException("Connection string 'Default' not found.");

			var optionsBuilder = new DbContextOptionsBuilder<CafeDbContext>();
			optionsBuilder.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 36)));

			return new CafeDbContext(optionsBuilder.Options);
		}
	}
}
