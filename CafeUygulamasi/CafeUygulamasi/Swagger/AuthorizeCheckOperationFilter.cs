using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace CafeUygulamasi.Swagger
{
	public class AuthorizeCheckOperationFilter : IOperationFilter
	{
		public void Apply(OpenApiOperation operation, OperationFilterContext context)
		{
			var hasAuthorize = context.ApiDescription.ActionDescriptor.EndpointMetadata
				.OfType<IAuthorizeData>()
				.Any();

			var allowAnonymous = context.ApiDescription.ActionDescriptor.EndpointMetadata
				.OfType<IAllowAnonymous>()
				.Any();

			if (!hasAuthorize || allowAnonymous)
				return;

			operation.Security ??= new List<OpenApiSecurityRequirement>();
			operation.Security.Add(new OpenApiSecurityRequirement
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
		}
	}
}
