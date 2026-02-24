using CafeUygulamasi.Data;
using CafeUygulamasi.Models.Settings;
using CafeUygulamasi.Swagger;
using CafeUygulamasi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Mvc.Authorization;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
	options.Filters.Add(new AuthorizeFilter());
});

builder.Services.AddDbContext<CafeDbContext>(options =>
	options.UseMySql(
		builder.Configuration.GetConnectionString("Default"),
		ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("Default"))
	)
);
builder.Services.Configure<CloudflareR2Options>(builder.Configuration.GetSection("CloudflareR2"));
builder.Services.AddSingleton<CloudflareR2StorageService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
	options.SwaggerDoc("v1", new OpenApiInfo { Title = "Cafe API", Version = "v1" });
	options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
	{
		Name = "Authorization",
		Type = SecuritySchemeType.Http,
		Scheme = "bearer",
		BearerFormat = "JWT",
		In = ParameterLocation.Header,
		Description = "JWT Authorization header using the Bearer scheme."
	});
	options.OperationFilter<AuthorizeCheckOperationFilter>();
	options.AddSecurityRequirement(new OpenApiSecurityRequirement
	{
		{
			new OpenApiSecurityScheme
			{
				Reference = new OpenApiReference
				{
					Type = ReferenceType.SecurityScheme,
					Id = "Bearer"
				}
			},
			Array.Empty<string>()
		}
	});
});

var jwtKey = builder.Configuration["Jwt:Key"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
	.AddJwtBearer(options =>
	{
		options.TokenValidationParameters = new TokenValidationParameters
		{
			ValidateIssuer = true,
			ValidateAudience = true,
			ValidateIssuerSigningKey = true,
			ValidIssuer = builder.Configuration["Jwt:Issuer"],
			ValidAudience = builder.Configuration["Jwt:Audience"],
			IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey ?? string.Empty))
		};
	});

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
	var db = scope.ServiceProvider.GetRequiredService<CafeDbContext>();
	var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbStartup");
	db.Database.Migrate();

	// Some environments keep old NOT NULL schema even after code updates.
	// This normalizes link columns so unlinked product/category flows can work.
	try
	{
		db.Database.ExecuteSqlRaw("""
			ALTER TABLE `Products` DROP FOREIGN KEY `FK_Products_Categories_CategoryId`;
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not drop FK_Products_Categories_CategoryId; continuing startup.");
	}

	try
	{
		db.Database.ExecuteSqlRaw("""
			ALTER TABLE `Products` MODIFY COLUMN `CategoryId` varchar(255) NULL;
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not alter Products.CategoryId to NULL; continuing startup.");
	}

	try
	{
		db.Database.ExecuteSqlRaw("""
			ALTER TABLE `Products` ADD CONSTRAINT `FK_Products_Categories_CategoryId`
			FOREIGN KEY (`CategoryId`) REFERENCES `Categories` (`Id`) ON DELETE SET NULL;
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not add FK_Products_Categories_CategoryId; continuing startup.");
	}

	try
	{
		db.Database.ExecuteSqlRaw("""
			ALTER TABLE `Categories` DROP FOREIGN KEY `FK_Categories_Menus_MenuId`;
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not drop FK_Categories_Menus_MenuId; continuing startup.");
	}

	try
	{
		db.Database.ExecuteSqlRaw("""
			ALTER TABLE `Categories` MODIFY COLUMN `MenuId` varchar(255) NULL;
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not alter Categories.MenuId to NULL; continuing startup.");
	}

	try
	{
		db.Database.ExecuteSqlRaw("""
			ALTER TABLE `Categories` ADD CONSTRAINT `FK_Categories_Menus_MenuId`
			FOREIGN KEY (`MenuId`) REFERENCES `Menus` (`Id`) ON DELETE SET NULL;
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not add FK_Categories_Menus_MenuId; continuing startup.");
	}

	try
	{
		db.Database.ExecuteSqlRaw("""
			CREATE TABLE IF NOT EXISTS `PageSectionContents` (
				`Id` varchar(255) NOT NULL,
				`PageKey` varchar(255) NOT NULL,
				`Title` longtext NULL,
				`Description` longtext NULL,
				`ImageUrl` longtext NULL,
				`Tags` longtext NOT NULL,
				CONSTRAINT `PK_PageSectionContents` PRIMARY KEY (`Id`)
			);
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not create PageSectionContents table; continuing startup.");
	}

	try
	{
		db.Database.ExecuteSqlRaw("""
			CREATE UNIQUE INDEX `UX_PageSectionContents_PageKey`
			ON `PageSectionContents` (`PageKey`);
			""");
	}
	catch (Exception ex)
	{
		logger.LogWarning(ex, "Could not create UX_PageSectionContents_PageKey; continuing startup.");
	}
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
