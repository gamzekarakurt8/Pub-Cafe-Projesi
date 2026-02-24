using CafeUygulamasi.Data;
using CafeUygulamasi.Models;
using CafeUygulamasi.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CafeUygulamasi.Controllers
{
	[ApiController]
	[Route("api/v1")]
	public class ProductController : Controller
	{
		private readonly CafeDbContext _context;

		public ProductController(CafeDbContext context)
		{
			_context = context;
		}

		// GET: api/v1/products
		[HttpGet("products")]
		[AllowAnonymous]
		public async Task<IActionResult> GetAll([FromQuery] string? categoryId)
		{
			var query = _context.Products.AsQueryable();
			if (!string.IsNullOrWhiteSpace(categoryId))
				query = query.Where(p => p.CategoryId == categoryId);

			var products = await query
				.OrderBy(p => p.Name)
				.Select(p => new
				{
					id = p.Id,
					categoryId = p.CategoryId,
					name = p.Name,
					description = p.Description,
					price = p.Price,
					discountedPrice = p.DiscountedPrice,
					inStock = p.InStock,
					imageUrl = p.ImageUrl,
					category = p.Category == null ? null : new
					{
						id = p.Category.Id,
						menuId = p.Category.MenuId,
						name = p.Category.Name,
						order = p.Category.Order,
						imageUrl = p.Category.ImageUrl
					}
				})
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = products,
				meta = new { count = products.Count }
			});
		}

		// GET: api/v1/categories/{categoryId}/products
		[HttpGet("categories/{categoryId}/products")]
		[AllowAnonymous]
		public async Task<IActionResult> GetByCategory(string categoryId)
		{
			var products = await _context.Products
				.Where(p => p.CategoryId == categoryId)
				.Select(p => new
				{
					id = p.Id,
					categoryId = p.CategoryId,
					name = p.Name,
					description = p.Description,
					price = p.Price,
					discountedPrice = p.DiscountedPrice,
					inStock = p.InStock,
					imageUrl = p.ImageUrl,
					category = p.Category == null ? null : new
					{
						id = p.Category.Id,
						menuId = p.Category.MenuId,
						name = p.Category.Name,
						order = p.Category.Order,
						imageUrl = p.Category.ImageUrl
					}
				})
				.ToListAsync();

			return Ok(new
			{
				success = true,
				data = products,
				meta = new { count = products.Count }
			});
		}

		// GET: api/v1/products/{id}
		[HttpGet("products/{id}")]
		[AllowAnonymous]
		public async Task<IActionResult> GetById(string id)
		{
			var product = await _context.Products
				.AsNoTracking()
				.Include(p => p.Category)
				.FirstOrDefaultAsync(p => p.Id == id);

			if (product == null)
				return NotFound(new { success = false, message = "Product not found" });

			var response = new
			{
				id = product.Id,
				categoryId = product.CategoryId,
				name = product.Name,
				description = product.Description,
				price = product.Price,
				discountedPrice = product.DiscountedPrice,
				inStock = product.InStock,
				imageUrl = product.ImageUrl,
				nutrition = product.Nutrition == null ? null : new
				{
					servingSize = product.Nutrition.ServingSize,
					caloriesKcal = product.Nutrition.CaloriesKcal,
					macros = product.Nutrition.Macros == null ? null : new
					{
						proteinG = product.Nutrition.Macros.ProteinG,
						carbsG = product.Nutrition.Macros.CarbsG,
						fatG = product.Nutrition.Macros.FatG
					},
					details = product.Nutrition.Details == null ? null : new
					{
						sugarG = product.Nutrition.Details.SugarG,
						fiberG = product.Nutrition.Details.FiberG,
						sodiumMg = product.Nutrition.Details.SodiumMg,
						energyKj = product.Nutrition.Details.EnergyKj
					},
					allergens = product.Nutrition.Allergens
				},
				category = product.Category == null ? null : new
				{
					id = product.Category.Id,
					menuId = product.Category.MenuId,
					name = product.Category.Name,
					order = product.Category.Order,
					imageUrl = product.Category.ImageUrl
				}
			};

			return Ok(new { success = true, data = response });
		}

		// POST: api/v1/categories/{categoryId}/products
		[HttpPost("categories/{categoryId}/products")]
		public async Task<IActionResult> Create(string categoryId, DtoProductCreate dto)
		{
			var categoryExists = await _context.Categories.AnyAsync(c => c.Id == categoryId);
			if (!categoryExists)
				return NotFound(new { success = false, message = "Category not found" });

			var product = new Product
			{
				Name = dto.Name,
				Description = dto.Description,
				Price = dto.Price,
				DiscountedPrice = dto.DiscountedPrice,
				InStock = dto.InStock,
				ImageUrl = dto.ImageUrl,
				Nutrition = MapNutrition(dto.Nutrition),
				CategoryId = categoryId
			};

			_context.Products.Add(product);
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = product });
		}

		// POST: api/v1/products
		[HttpPost("products")]
		public async Task<IActionResult> Create(DtoProductCreate dto)
		{
			var product = new Product
			{
				Name = dto.Name,
				Description = dto.Description,
				Price = dto.Price,
				DiscountedPrice = dto.DiscountedPrice,
				InStock = dto.InStock,
				ImageUrl = dto.ImageUrl,
				Nutrition = MapNutrition(dto.Nutrition),
				CategoryId = null
			};

			_context.Products.Add(product);
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = product });
		}

		// POST: api/v1/products/{productId}/category-link
		[HttpPost("products/{productId}/category-link")]
		public async Task<IActionResult> LinkCategoryToProduct(string productId, DtoProductCategoryLinkCreate dto)
		{
			if (string.IsNullOrWhiteSpace(dto.CategoryId))
				return BadRequest(new { success = false, message = "categoryId is required" });

			var product = await _context.Products.FindAsync(productId);
			if (product == null)
				return NotFound(new { success = false, message = "Product not found" });

			var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
			if (!categoryExists)
				return NotFound(new { success = false, message = "Category not found" });

			product.CategoryId = dto.CategoryId;
			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = new { productId, categoryId = dto.CategoryId } });
		}

		// DELETE: api/v1/products/{productId}/category-link
		[HttpDelete("products/{productId}/category-link")]
		public async Task<IActionResult> UnlinkCategoryFromProduct(string productId)
		{
			var product = await _context.Products.FindAsync(productId);
			if (product == null)
				return NotFound(new { success = false, message = "Product not found" });

			product.CategoryId = null;
			await _context.SaveChangesAsync();

			return NoContent();
		}

		// PUT: api/v1/products/{id}
		[HttpPut("products/{id}")]
		public async Task<IActionResult> Update(string id, DtoProductUpdate dto)
		{
			var product = await _context.Products.FindAsync(id);

			if (product == null)
				return NotFound(new { success = false, message = "Product not found" });

			product.Name = dto.Name;
			product.Description = dto.Description;
			product.Price = dto.Price;
			product.DiscountedPrice = dto.DiscountedPrice;
			product.InStock = dto.InStock;
			product.ImageUrl = dto.ImageUrl;
			product.Nutrition = MapNutrition(dto.Nutrition);

			await _context.SaveChangesAsync();

			return Ok(new { success = true, data = product });
		}

		private static ProductNutrition? MapNutrition(DtoProductNutrition? dto)
		{
			if (dto == null)
				return null;

			return new ProductNutrition
			{
				ServingSize = dto.ServingSize,
				CaloriesKcal = dto.CaloriesKcal,
				Macros = dto.Macros == null ? null : new ProductMacros
				{
					ProteinG = dto.Macros.ProteinG,
					CarbsG = dto.Macros.CarbsG,
					FatG = dto.Macros.FatG
				},
				Details = dto.Details == null ? null : new ProductNutritionDetails
				{
					SugarG = dto.Details.SugarG,
					FiberG = dto.Details.FiberG,
					SodiumMg = dto.Details.SodiumMg,
					EnergyKj = dto.Details.EnergyKj
				},
				Allergens = dto.Allergens ?? new List<string>()
			};
		}

		// DELETE: api/v1/products/{id}
		[HttpDelete("products/{id}")]
		public async Task<IActionResult> Delete(string id)
		{
			var product = await _context.Products.FindAsync(id);

			if (product == null)
				return NotFound(new { success = false, message = "Product not found" });

			_context.Products.Remove(product);
			await _context.SaveChangesAsync();

			return Ok(new
			{
				success = true,
				data = new { deleted = true, id }
			});
		}

	}
}
